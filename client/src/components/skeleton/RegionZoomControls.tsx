import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ZoomIn, Target, Bone, CircleDot } from 'lucide-react';
import { AnatomicalRegion, ANATOMICAL_REGION_PRESETS } from './PureThreeGLBViewer';

interface RegionZoomControlsProps {
  currentRegion: AnatomicalRegion | null;
  onRegionChange: (region: AnatomicalRegion) => void;
  className?: string;
}

const REGION_GROUPS = {
  spine: {
    label: 'Spine',
    regions: ['cervical_spine', 'thoracic_spine', 'lumbar_spine'] as AnatomicalRegion[],
  },
  upper: {
    label: 'Upper Body',
    regions: ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow'] as AnatomicalRegion[],
  },
  lower: {
    label: 'Lower Body',
    regions: ['pelvis', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'] as AnatomicalRegion[],
  },
};

export default function RegionZoomControls({
  currentRegion,
  onRegionChange,
  className = ''
}: RegionZoomControlsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            data-testid="btn-zoom-regions"
          >
            <ZoomIn className="h-4 w-4" />
            <span className="hidden sm:inline">
              {currentRegion ? ANATOMICAL_REGION_PRESETS[currentRegion].label : 'Zoom to Region'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Anatomical Region Zoom</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRegionChange('full_body')}
                className="text-xs h-7"
                data-testid="btn-zoom-reset"
              >
                <Target className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Bone className="h-3 w-3" />
                  Spine
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {REGION_GROUPS.spine.regions.map((region) => (
                    <Button
                      key={region}
                      variant={currentRegion === region ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onRegionChange(region)}
                      className="text-xs h-8"
                      data-testid={`btn-zoom-${region}`}
                    >
                      {ANATOMICAL_REGION_PRESETS[region].label.replace(' Spine', '')}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <CircleDot className="h-3 w-3" />
                  Upper Body
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {REGION_GROUPS.upper.regions.map((region) => (
                    <Button
                      key={region}
                      variant={currentRegion === region ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onRegionChange(region)}
                      className="text-xs h-8"
                      data-testid={`btn-zoom-${region}`}
                    >
                      {ANATOMICAL_REGION_PRESETS[region].label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <CircleDot className="h-3 w-3" />
                  Lower Body
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant={currentRegion === 'pelvis' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onRegionChange('pelvis')}
                    className="text-xs h-8 col-span-2"
                    data-testid="btn-zoom-pelvis"
                  >
                    Pelvis
                  </Button>
                  {REGION_GROUPS.lower.regions.filter(r => r !== 'pelvis').map((region) => (
                    <Button
                      key={region}
                      variant={currentRegion === region ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onRegionChange(region)}
                      className="text-xs h-8"
                      data-testid={`btn-zoom-${region}`}
                    >
                      {ANATOMICAL_REGION_PRESETS[region].label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {currentRegion && currentRegion !== 'full_body' && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                {ANATOMICAL_REGION_PRESETS[currentRegion].description}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
