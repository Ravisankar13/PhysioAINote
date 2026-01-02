import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ZoomIn, Target, Bone, CircleDot, ChevronRight, ArrowLeft } from 'lucide-react';
import { AnatomicalRegion, ANATOMICAL_REGION_PRESETS, LUMBAR_SEGMENTS, SUB_STRUCTURES, SpinalSegment, SubStructure } from './PureThreeGLBViewer';

interface RegionZoomControlsProps {
  currentRegion: AnatomicalRegion | null;
  onRegionChange: (region: AnatomicalRegion) => void;
  className?: string;
}

// Helper to check if a region is a lumbar segment
const isLumbarSegment = (region: AnatomicalRegion | null): region is SpinalSegment => {
  return region !== null && LUMBAR_SEGMENTS.includes(region as SpinalSegment);
};

// Helper to check if a region is a sub-structure view
const isSubStructure = (region: AnatomicalRegion | null): boolean => {
  if (!region) return false;
  return region.includes('_facet') || region.includes('_pars') || region.includes('_disc') || 
         region.includes('_body') || region.includes('_spinous');
};

// Extract base segment from sub-structure region
const getBaseSegment = (region: AnatomicalRegion): SpinalSegment | null => {
  for (const segment of LUMBAR_SEGMENTS) {
    if (region.startsWith(segment)) return segment;
  }
  return null;
};

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
  // Track selected segment for sub-structure navigation
  const [selectedSegment, setSelectedSegment] = useState<SpinalSegment | null>(null);
  
  // Determine navigation state
  const showSegmentSelection = currentRegion === 'lumbar_spine' || isLumbarSegment(currentRegion) || isSubStructure(currentRegion);
  const showSubStructures = isLumbarSegment(currentRegion) || isSubStructure(currentRegion);
  const activeSegment = isSubStructure(currentRegion!) ? getBaseSegment(currentRegion!) : 
                        isLumbarSegment(currentRegion) ? currentRegion : selectedSegment;
  
  const handleSegmentClick = (segment: SpinalSegment) => {
    setSelectedSegment(segment);
    onRegionChange(segment);
  };
  
  const handleSubStructureClick = (structure: SubStructure) => {
    if (activeSegment) {
      const subRegion = `${activeSegment}_${structure}` as AnatomicalRegion;
      onRegionChange(subRegion);
    }
  };
  
  const handleBackToLumbar = () => {
    setSelectedSegment(null);
    onRegionChange('lumbar_spine');
  };
  
  const handleBackToSegment = () => {
    if (activeSegment) {
      onRegionChange(activeSegment);
    }
  };

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
                onClick={() => {
                  setSelectedSegment(null);
                  onRegionChange('full_body');
                }}
                className="text-xs h-7"
                data-testid="btn-zoom-reset"
              >
                <Target className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>

            {/* Sub-structure selection panel - shows when viewing a specific segment */}
            {showSubStructures && activeSegment && (
              <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToLumbar}
                    className="text-xs h-7 -ml-2"
                    data-testid="btn-back-to-lumbar"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Lumbar
                  </Button>
                  <span className="text-sm font-medium">{ANATOMICAL_REGION_PRESETS[activeSegment].label}</span>
                </div>
                
                {/* Segment selector within lumbar */}
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Select Segment</div>
                  <div className="flex gap-1 flex-wrap">
                    {LUMBAR_SEGMENTS.map((segment) => (
                      <Button
                        key={segment}
                        variant={activeSegment === segment ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSegmentClick(segment)}
                        className="text-xs h-7 px-2"
                        data-testid={`btn-segment-${segment}`}
                      >
                        {ANATOMICAL_REGION_PRESETS[segment].label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Sub-structure buttons */}
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Sub-structures</div>
                  <div className="grid grid-cols-2 gap-1">
                    {SUB_STRUCTURES.map((structure) => {
                      const subRegion = `${activeSegment}_${structure.id}` as AnatomicalRegion;
                      const isActive = currentRegion === subRegion;
                      return (
                        <Button
                          key={structure.id}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSubStructureClick(structure.id)}
                          className="text-xs h-8 justify-start"
                          data-testid={`btn-structure-${structure.id}`}
                        >
                          {structure.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Description */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {currentRegion && ANATOMICAL_REGION_PRESETS[currentRegion]?.description}
                </div>
              </div>
            )}

            {/* Segment selection panel - shows when lumbar spine is selected but no segment yet */}
            {currentRegion === 'lumbar_spine' && !selectedSegment && (
              <div className="space-y-3 border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/30">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  Select a segment for detailed view
                </div>
                <div className="flex gap-1 flex-wrap">
                  {LUMBAR_SEGMENTS.map((segment) => (
                    <Button
                      key={segment}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSegmentClick(segment)}
                      className="text-xs h-8"
                      data-testid={`btn-segment-${segment}`}
                    >
                      {ANATOMICAL_REGION_PRESETS[segment].label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Main region selection - hidden when deep in lumbar navigation */}
            {!showSubStructures && (
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
                        onClick={() => {
                          setSelectedSegment(null);
                          onRegionChange(region);
                        }}
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
            )}

            {/* Description for non-segment regions */}
            {currentRegion && currentRegion !== 'full_body' && !showSubStructures && currentRegion !== 'lumbar_spine' && (
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
