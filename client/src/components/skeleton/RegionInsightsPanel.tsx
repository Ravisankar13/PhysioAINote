import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bone, 
  Activity, 
  AlertTriangle, 
  Shield, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import type { AnatomicalRegion } from './PureThreeGLBViewer';
import { 
  REGION_PROFILES,
  analyzeRegion,
  type RegionAnalysisResult,
  type StructureLoadAnalysis,
  type ConditionProbability,
  type AnatomyStructure
} from '@/lib/regionClinicalProfiles';

interface RegionInsightsPanelProps {
  selectedRegion: AnatomicalRegion | null;
  spineFlexion: number;
  spineRotation: number;
  spineLateralFlexion: number;
  pelvisTilt: number;
  pelvisObliquity?: number;
  pelvisRotation?: number;
  bodyWeightKg?: number;
  className?: string;
}

const STATUS_COLORS = {
  safe: 'bg-green-500',
  caution: 'bg-yellow-500',
  warning: 'bg-orange-500',
  critical: 'bg-red-500',
};

const RISK_COLORS = {
  minimal: 'bg-green-100 text-green-800 border-green-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const RISK_PROGRESS_COLORS = {
  minimal: 'bg-green-500',
  low: 'bg-blue-500',
  moderate: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

function AnatomyTab({ structures }: { structures: AnatomyStructure[] }) {
  const groupedStructures = useMemo(() => {
    const groups: Record<string, AnatomyStructure[]> = {};
    structures.forEach(s => {
      if (!groups[s.type]) groups[s.type] = [];
      groups[s.type].push(s);
    });
    return groups;
  }, [structures]);

  const typeLabels: Record<string, { label: string; icon: JSX.Element }> = {
    bone: { label: 'Bones & Vertebrae', icon: <Bone className="w-4 h-4" /> },
    disc: { label: 'Intervertebral Discs', icon: <Activity className="w-4 h-4" /> },
    joint: { label: 'Facet Joints', icon: <Activity className="w-4 h-4" /> },
    ligament: { label: 'Ligaments', icon: <Activity className="w-4 h-4" /> },
    nerve: { label: 'Neural Structures', icon: <AlertTriangle className="w-4 h-4" /> },
    muscle: { label: 'Muscles', icon: <Activity className="w-4 h-4" /> },
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {Object.entries(groupedStructures).map(([type, items]) => (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              {typeLabels[type]?.icon}
              <span>{typeLabels[type]?.label || type}</span>
              <Badge variant="outline" className="ml-auto">{items.length}</Badge>
            </div>
            <div className="space-y-1 pl-6">
              {items.map(structure => (
                <div 
                  key={structure.id} 
                  className="p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  data-testid={`anatomy-structure-${structure.id}`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{structure.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 pl-5">
                    {structure.clinicalRelevance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function LoadsTab({ loads }: { loads: StructureLoadAnalysis[] }) {
  const sortedLoads = useMemo(() => {
    return [...loads].sort((a, b) => b.percentOfCritical - a.percentOfCritical);
  }, [loads]);

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-3">
        {sortedLoads.map(load => (
          <div 
            key={load.structureId} 
            className="p-3 rounded-lg border bg-card"
            data-testid={`load-structure-${load.structureId}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[load.status]}`} />
                <span className="font-medium text-sm">{load.structureName}</span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  load.status === 'critical' ? 'border-red-500 text-red-600' :
                  load.status === 'warning' ? 'border-orange-500 text-orange-600' :
                  load.status === 'caution' ? 'border-yellow-500 text-yellow-600' :
                  'border-green-500 text-green-600'
                }`}
              >
                {load.loadType.charAt(0).toUpperCase() + load.loadType.slice(1)}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {load.loadType === 'compression' || load.loadType === 'shear' 
                    ? `${load.currentLoad}N` 
                    : `${load.currentLoad}mm`}
                </span>
                <span>{load.percentOfCritical}% of threshold</span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`absolute h-full rounded-full transition-all duration-300 ${STATUS_COLORS[load.status]}`}
                  style={{ width: `${Math.min(100, load.percentOfCritical)}%` }}
                />
                <div 
                  className="absolute h-full w-0.5 bg-white/50"
                  style={{ left: `${(load.safeThreshold / load.criticalThreshold) * 100}%` }}
                  title="Safe threshold"
                />
                <div 
                  className="absolute h-full w-0.5 bg-white/50"
                  style={{ left: `${(load.warningThreshold / load.criticalThreshold) * 100}%` }}
                  title="Warning threshold"
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Safe: {load.safeThreshold}{load.loadType !== 'compression' && load.loadType !== 'shear' ? 'mm' : 'N'}</span>
                <span>Critical: {load.criticalThreshold}{load.loadType !== 'compression' && load.loadType !== 'shear' ? 'mm' : 'N'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function ConditionsTab({ conditions }: { conditions: ConditionProbability[] }) {
  const sortedConditions = useMemo(() => {
    return [...conditions].sort((a, b) => b.probability - a.probability);
  }, [conditions]);

  const getTrendIcon = (probability: number) => {
    if (probability > 50) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (probability > 25) return <Minus className="w-4 h-4 text-yellow-500" />;
    return <TrendingDown className="w-4 h-4 text-green-500" />;
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-3">
        {sortedConditions.map(condition => (
          <div 
            key={condition.conditionId} 
            className="p-3 rounded-lg border bg-card"
            data-testid={`condition-${condition.conditionId}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getTrendIcon(condition.probability)}
                <span className="font-medium text-sm">{condition.conditionName}</span>
              </div>
              <Badge className={RISK_COLORS[condition.riskLevel]}>
                {condition.probability}%
              </Badge>
            </div>
            
            <div className="relative h-2 rounded-full bg-muted overflow-hidden mb-2">
              <div 
                className={`absolute h-full rounded-full transition-all duration-300 ${RISK_PROGRESS_COLORS[condition.riskLevel]}`}
                style={{ width: `${condition.probability}%` }}
              />
            </div>

            {condition.contributingFactors.length > 0 && (
              <div className="space-y-1 mt-2">
                <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Risk Factors:</span>
                </div>
                <ul className="text-xs text-muted-foreground pl-4 space-y-0.5">
                  {condition.contributingFactors.map((factor, i) => (
                    <li key={i} className="list-disc">{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {condition.protectiveFactors.length > 0 && (
              <div className="space-y-1 mt-2">
                <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <Shield className="w-3 h-3" />
                  <span>Protective Factors:</span>
                </div>
                <ul className="text-xs text-muted-foreground pl-4 space-y-0.5">
                  {condition.protectiveFactors.map((factor, i) => (
                    <li key={i} className="list-disc">{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function RegionInsightsPanel({
  selectedRegion,
  spineFlexion,
  spineRotation,
  spineLateralFlexion,
  pelvisTilt,
  pelvisObliquity = 0,
  pelvisRotation = 0,
  bodyWeightKg = 70,
  className = '',
}: RegionInsightsPanelProps) {
  const [analysis, setAnalysis] = useState<RegionAnalysisResult | null>(null);

  const profile = selectedRegion ? REGION_PROFILES[selectedRegion] : null;

  useEffect(() => {
    if (selectedRegion && profile) {
      const result = analyzeRegion(
        selectedRegion,
        spineFlexion,
        spineRotation,
        spineLateralFlexion,
        pelvisTilt,
        pelvisObliquity,
        pelvisRotation,
        bodyWeightKg
      );
      setAnalysis(result);
    } else {
      setAnalysis(null);
    }
  }, [selectedRegion, spineFlexion, spineRotation, spineLateralFlexion, pelvisTilt, pelvisObliquity, pelvisRotation, bodyWeightKg, profile]);

  if (!selectedRegion || selectedRegion === 'full_body') {
    return (
      <Card className={`${className} bg-muted/30`}>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          <p className="text-sm text-center">
            Select a body region to view detailed<br />anatomy, loads, and clinical conditions
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg capitalize">
            {selectedRegion.replace(/_/g, ' ')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Clinical analysis for this region coming soon.</p>
          <p className="mt-2">Currently supported: Lumbar Spine, Cervical Spine, Thoracic Spine, Pelvis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="region-insights-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{profile.displayName}</CardTitle>
          {analysis && (
            <Badge 
              className={
                analysis.overallRiskScore < 20 ? RISK_COLORS.minimal :
                analysis.overallRiskScore < 40 ? RISK_COLORS.low :
                analysis.overallRiskScore < 60 ? RISK_COLORS.moderate :
                analysis.overallRiskScore < 80 ? RISK_COLORS.high :
                RISK_COLORS.critical
              }
            >
              Risk: {analysis.overallRiskScore}%
            </Badge>
          )}
        </div>
        {analysis && (
          <p className="text-xs text-muted-foreground mt-1">
            {analysis.clinicalSummary}
          </p>
        )}
      </CardHeader>
      
      <Separator />
      
      <CardContent className="pt-4">
        <Tabs defaultValue="loads" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="anatomy" className="text-xs" data-testid="tab-anatomy">
              <Bone className="w-3 h-3 mr-1" />
              Anatomy
            </TabsTrigger>
            <TabsTrigger value="loads" className="text-xs" data-testid="tab-loads">
              <Activity className="w-3 h-3 mr-1" />
              Loads
            </TabsTrigger>
            <TabsTrigger value="conditions" className="text-xs" data-testid="tab-conditions">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Conditions
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="anatomy">
            <AnatomyTab structures={profile.anatomyStructures} />
          </TabsContent>
          
          <TabsContent value="loads">
            {analysis ? (
              <LoadsTab loads={analysis.structureLoads} />
            ) : (
              <p className="text-sm text-muted-foreground">No load data available</p>
            )}
          </TabsContent>
          
          <TabsContent value="conditions">
            {analysis ? (
              <ConditionsTab conditions={analysis.conditionProbabilities} />
            ) : (
              <p className="text-sm text-muted-foreground">No condition data available</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
