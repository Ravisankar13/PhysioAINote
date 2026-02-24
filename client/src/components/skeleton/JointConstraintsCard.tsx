import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  ArrowRight,
  Activity,
  Bone,
  RefreshCw
} from 'lucide-react';
import {
  JointConstraint,
  JointType,
  MovementType,
  ConstraintReason,
  CompensationResult,
  NORMAL_ROM,
  REASON_LABELS,
  getJointMovements,
  getJointDisplayInfo,
  createDefaultConstraint,
  calculateCompensations,
} from '@/lib/jointConstraints';

interface JointConstraintsCardProps {
  constraints: JointConstraint[];
  onConstraintsChange: (constraints: JointConstraint[]) => void;
  className?: string;
}

const JOINTS_BY_CATEGORY = {
  'Spine': ['cervical_spine', 'thoracic_spine', 'lumbar_spine'] as JointType[],
  'Core': ['pelvis'] as JointType[],
  'Lower Limb': ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'] as JointType[],
  'Upper Limb': ['left_shoulder', 'right_shoulder'] as JointType[],
};

export function JointConstraintsCard({ 
  constraints, 
  onConstraintsChange,
  className = ''
}: JointConstraintsCardProps) {
  const [selectedJoint, setSelectedJoint] = useState<JointType>('lumbar_spine');
  const [selectedMovement, setSelectedMovement] = useState<MovementType | ''>('');
  const [activeTab, setActiveTab] = useState('constraints');

  const availableMovements = useMemo(() => getJointMovements(selectedJoint), [selectedJoint]);
  
  const compensationResult = useMemo(() => 
    calculateCompensations(constraints), 
    [constraints]
  );

  const handleAddConstraint = () => {
    if (!selectedMovement) return;
    
    const existing = constraints.find(
      c => c.joint === selectedJoint && c.movement === selectedMovement
    );
    if (existing) return;

    const newConstraint = createDefaultConstraint(selectedJoint, selectedMovement as MovementType);
    onConstraintsChange([...constraints, newConstraint]);
    setSelectedMovement('');
  };

  const handleRemoveConstraint = (id: string) => {
    onConstraintsChange(constraints.filter(c => c.id !== id));
  };

  const handleUpdateConstraint = (id: string, updates: Partial<JointConstraint>) => {
    onConstraintsChange(
      constraints.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  };

  const handleClearAll = () => {
    onConstraintsChange([]);
  };

  const formatMovementName = (movement: string) => {
    return movement.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const activeConstraints = constraints.filter(c => c.isActive);

  return (
    <Card className={`bg-gradient-to-br from-orange-900/30 to-red-900/30 border-orange-500/30 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-orange-300">
            <Lock className="h-5 w-5" />
            Joint Constraints
          </CardTitle>
          <Badge variant="outline" className="border-orange-500/50">
            {activeConstraints.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="constraints" className="text-xs" data-testid="tab-constraints">
              <Lock className="h-3 w-3 mr-1" />
              Constraints
            </TabsTrigger>
            <TabsTrigger value="compensations" className="text-xs" data-testid="tab-compensations">
              <RefreshCw className="h-3 w-3 mr-1" />
              Compensations
            </TabsTrigger>
            <TabsTrigger value="warnings" className="text-xs" data-testid="tab-warnings">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Warnings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="constraints" className="space-y-4">
            <div className="bg-black/20 rounded-lg p-3 space-y-3">
              <div className="flex gap-2">
                <Select value={selectedJoint} onValueChange={(v) => {
                  setSelectedJoint(v as JointType);
                  setSelectedMovement('');
                }}>
                  <SelectTrigger className="flex-1" data-testid="select-joint">
                    <SelectValue placeholder="Select joint..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(JOINTS_BY_CATEGORY).map(([category, joints]) => (
                      <div key={category}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{category}</div>
                        {joints.map(joint => {
                          const info = getJointDisplayInfo(joint);
                          return (
                            <SelectItem key={joint} value={joint}>
                              {info.icon} {info.name}
                            </SelectItem>
                          );
                        })}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Select value={selectedMovement} onValueChange={(v) => setSelectedMovement(v as MovementType)}>
                  <SelectTrigger className="flex-1" data-testid="select-movement">
                    <SelectValue placeholder="Select movement..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMovements.map(movement => (
                      <SelectItem key={movement} value={movement}>
                        {formatMovementName(movement)} ({NORMAL_ROM[selectedJoint]?.[movement]}°)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddConstraint} 
                  disabled={!selectedMovement}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="btn-add-constraint"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[280px]">
              <div className="space-y-3 pr-3">
                {constraints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Unlock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No constraints added</p>
                    <p className="text-xs mt-1">Add a constraint to model movement restrictions</p>
                  </div>
                ) : (
                  constraints.map(constraint => {
                    const jointInfo = getJointDisplayInfo(constraint.joint);
                    const restrictionPercent = Math.round((1 - constraint.maxROM / constraint.normalROM) * 100);
                    
                    return (
                      <div 
                        key={constraint.id}
                        className={`bg-black/30 rounded-lg p-3 border ${
                          constraint.isActive 
                            ? 'border-orange-500/50' 
                            : 'border-gray-600/30 opacity-60'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={constraint.isActive}
                              onCheckedChange={(checked) => 
                                handleUpdateConstraint(constraint.id, { isActive: checked })
                              }
                              data-testid={`switch-constraint-${constraint.id}`}
                            />
                            <div>
                              <div className="flex items-center gap-1 text-sm font-medium">
                                <span>{jointInfo.icon}</span>
                                <span>{jointInfo.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatMovementName(constraint.movement)}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:text-red-300"
                            onClick={() => handleRemoveConstraint(constraint.id)}
                            data-testid={`btn-remove-${constraint.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Max ROM</span>
                            <span className={restrictionPercent > 50 ? 'text-red-400' : 'text-orange-400'}>
                              {constraint.maxROM}° / {constraint.normalROM}° ({restrictionPercent}% restricted)
                            </span>
                          </div>
                          <Slider
                            value={[constraint.maxROM]}
                            onValueChange={([value]) => 
                              handleUpdateConstraint(constraint.id, { maxROM: value })
                            }
                            min={0}
                            max={constraint.normalROM}
                            step={1}
                            className="cursor-pointer"
                            data-testid={`slider-rom-${constraint.id}`}
                          />

                          <div className="flex gap-2 mt-2">
                            <Select 
                              value={constraint.reason} 
                              onValueChange={(v) => 
                                handleUpdateConstraint(constraint.id, { reason: v as ConstraintReason })
                              }
                            >
                              <SelectTrigger className="h-7 text-xs flex-1" data-testid={`select-reason-${constraint.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(REASON_LABELS).map(([reason, { label, color }]) => (
                                  <SelectItem key={reason} value={reason}>
                                    <span className={color}>{label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {constraint.reason === 'pain' && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">Pain:</span>
                                <Select
                                  value={String(constraint.painLevel || 0)}
                                  onValueChange={(v) => 
                                    handleUpdateConstraint(constraint.id, { painLevel: parseInt(v) })
                                  }
                                >
                                  <SelectTrigger className="h-7 w-16 text-xs" data-testid={`select-pain-${constraint.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                                      <SelectItem key={level} value={String(level)}>
                                        {level}/10
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {constraints.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="w-full text-red-400 border-red-500/30 hover:bg-red-900/30"
                data-testid="btn-clear-all"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Constraints
              </Button>
            )}
          </TabsContent>

          <TabsContent value="compensations" className="space-y-3">
            <CompensationPatternsList compensationResult={compensationResult} />
          </TabsContent>

          <TabsContent value="warnings" className="space-y-3">
            <ClinicalWarningsList compensationResult={compensationResult} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CompensationPatternsList({ compensationResult }: { compensationResult: CompensationResult }) {
  if (compensationResult.patterns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No compensation patterns</p>
        <p className="text-xs mt-1">Add constraints to see how other joints compensate</p>
      </div>
    );
  }

  const formatJointName = (joint: JointType) => 
    joint.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const formatMovement = (movement: MovementType) =>
    movement.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <ScrollArea className="h-[320px]">
      <div className="space-y-3 pr-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-orange-300">Compensation Patterns</span>
          <Badge variant="outline" className="bg-orange-900/30">
            {Math.round(compensationResult.totalCompensation * 100)}% Total Load Shift
          </Badge>
        </div>

        {compensationResult.patterns.map((pattern, idx) => (
          <div 
            key={idx}
            className="bg-black/30 rounded-lg p-3 border border-yellow-500/30"
          >
            <div className="flex items-center gap-2 text-sm mb-2">
              <Badge variant="outline" className="bg-red-900/30 text-red-300 border-red-500/30">
                {formatJointName(pattern.sourceJoint)}
              </Badge>
              <ArrowRight className="h-4 w-4 text-yellow-500" />
              <Badge variant="outline" className="bg-yellow-900/30 text-yellow-300 border-yellow-500/30">
                {formatJointName(pattern.compensatingJoint)}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground mb-2">
              {formatMovement(pattern.sourceMovement)} → {formatMovement(pattern.compensatingMovement)}
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Compensation ratio</span>
              <span className="text-yellow-400">{Math.round(pattern.compensationRatio * 100)}%</span>
            </div>

            <div className="flex justify-between text-xs mt-1">
              <span className="text-muted-foreground">Additional load</span>
              <span className={pattern.additionalLoad > 25 ? 'text-red-400' : 'text-orange-400'}>
                +{Math.round(pattern.additionalLoad)}%
              </span>
            </div>

            <div className="mt-2 text-xs text-blue-300 bg-blue-900/20 rounded p-2">
              {pattern.clinicalNote}
            </div>
          </div>
        ))}

        {compensationResult.overloadedStructures.length > 0 && (
          <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Bone className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">Overloaded Structures</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {compensationResult.overloadedStructures.map((structure, idx) => (
                <Badge key={idx} variant="outline" className="bg-red-900/30 text-red-300 border-red-500/30 text-xs">
                  {structure}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function ClinicalWarningsList({ compensationResult }: { compensationResult: CompensationResult }) {
  if (compensationResult.clinicalWarnings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No clinical warnings</p>
        <p className="text-xs mt-1">Add significant constraints to see clinical implications</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[320px]">
      <div className="space-y-3 pr-3">
        {compensationResult.clinicalWarnings.map((warning, idx) => (
          <div 
            key={idx}
            className={`rounded-lg p-3 flex gap-3 ${
              warning.severity === 'severe'
                ? 'bg-red-900/20 border border-red-500/30'
                : 'bg-amber-900/20 border border-amber-500/30'
            }`}
          >
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
              warning.severity === 'severe' ? 'text-red-400' : 'text-amber-400'
            }`} />
            <div className={`text-sm ${
              warning.severity === 'severe' ? 'text-red-200' : 'text-amber-200'
            }`}>{warning.message}</div>
          </div>
        ))}

        <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-500/30 mt-4">
          <div className="text-sm font-medium text-yellow-300 mb-2">Clinical Considerations</div>
          <ul className="text-xs text-yellow-200 space-y-1">
            <li>• Compensation patterns may lead to secondary injuries</li>
            <li>• Address primary restrictions to reduce compensatory strain</li>
            <li>• Monitor compensating joints for signs of overload</li>
            <li>• Consider movement retraining after addressing restrictions</li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
