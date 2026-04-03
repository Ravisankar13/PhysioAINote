import { useState, useMemo, useCallback } from 'react';
import {
  Activity, AlertTriangle, ArrowLeftRight, BarChart3, ChevronDown,
  ChevronRight, Gauge, GitBranch, Layers, MoveHorizontal, PlayCircle, Shield, TrendingUp, Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  BiomechanicsOutput,
  FaultRuleConfig,
  BiomechanicalFault,
  UnifiedJointForce,
  PosturalDeviation,
  MuscleStateEntry,
  AsymmetryEntry,
  MovementTaskOutput,
  ComparisonEntry,
  JointKinematicsOutput,
  JointKinematicsEntry,
  CompensationOutput,
  CompensationPattern,
  MovementTaskFault,
} from '@/lib/unifiedBiomechanicsEngine';
import { AVAILABLE_MOVEMENT_TASKS, DEFAULT_FAULT_RULES } from '@/lib/unifiedBiomechanicsEngine';

interface UnifiedBiomechanicsPanelProps {
  output: BiomechanicsOutput | null;
  onMovementTaskChange: (taskId: string | undefined) => void;
  onMovementProgressChange: (progress: number) => void;
  onFaultRuleOverride: (overrides: Partial<FaultRuleConfig>[]) => void;
  selectedMovementTask?: string;
  movementProgress?: number;
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'severe': return 'text-red-400';
    case 'moderate': return 'text-amber-400';
    case 'mild': return 'text-yellow-300';
    default: return 'text-slate-400';
  }
}

function severityBadge(severity: string) {
  const variant = severity === 'severe' ? 'destructive' as const : severity === 'moderate' ? 'secondary' as const : 'outline' as const;
  return <Badge variant={variant} className="text-[10px] px-1.5 py-0">{severity}</Badge>;
}

function statusColor(status: string): string {
  switch (status) {
    case 'very_high': return 'text-red-400';
    case 'high': return 'text-orange-400';
    case 'moderate': return 'text-amber-400';
    default: return 'text-green-400';
  }
}

function roleColor(role: string): string {
  switch (role) {
    case 'overactive': return 'text-red-400';
    case 'underactive': return 'text-amber-400';
    case 'inhibited': return 'text-red-300';
    default: return 'text-green-400';
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function QualityGauge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
      <Gauge className="w-5 h-5 text-slate-400" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-400">Overall Quality</span>
          <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}/100</span>
        </div>
        <Progress value={score} className="h-1.5" />
      </div>
    </div>
  );
}

function ForceTab({ forces }: { forces: BiomechanicsOutput['forces'] }) {
  const [expanded, setExpanded] = useState(false);
  const displayJoints = expanded ? forces.joints : forces.joints.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
        <div className="text-[11px] text-slate-400 mb-1">Weight Distribution</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-blue-400 w-8">L {forces.weightDistribution.leftPct}%</span>
          <div className="flex-1 h-2 rounded bg-slate-700 overflow-hidden flex">
            <div className="bg-blue-500 h-full" style={{ width: `${forces.weightDistribution.leftPct}%` }} />
            <div className="bg-emerald-500 h-full flex-1" />
          </div>
          <span className="text-[10px] text-emerald-400 w-8">R {forces.weightDistribution.rightPct}%</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">{forces.weightDistribution.clinical}</div>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Joint Forces
          <span className="ml-auto text-slate-500">Peak: {forces.peakJoint} ({forces.peakForceBW.toFixed(1)} BW)</span>
        </div>
        {displayJoints.map((j: UnifiedJointForce) => (
          <div key={j.joint} className="flex items-center gap-2 py-0.5">
            <span className="text-[10px] text-slate-400 w-24 truncate">{j.joint}</span>
            <div className="flex-1 h-1.5 rounded bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded ${j.status === 'very_high' ? 'bg-red-500' : j.status === 'high' ? 'bg-orange-500' : j.status === 'moderate' ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, (j.totalBW / 5) * 100)}%` }}
              />
            </div>
            <span className={`text-[10px] w-12 text-right ${statusColor(j.status)}`}>
              {j.totalBW.toFixed(1)} BW
            </span>
          </div>
        ))}
        {forces.joints.length > 6 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expanded ? 'Show less' : `Show all ${forces.joints.length} joints`}
          </button>
        )}
      </div>
    </div>
  );
}

function PostureTab({ posture }: { posture: BiomechanicsOutput['posture'] }) {
  return (
    <div className="space-y-3">
      <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Alignment Score</span>
          <span className={`text-sm font-bold ${scoreColor(posture.overallAlignmentScore)}`}>
            {posture.overallAlignmentScore}/100
          </span>
        </div>
        {posture.dominantPattern !== 'Within normal limits' && (
          <div className="text-[10px] text-amber-400 mt-1">Dominant: {posture.dominantPattern}</div>
        )}
      </div>

      {posture.deviations.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-400">Postural Deviations ({posture.deviations.length})</div>
          {posture.deviations.map((d: PosturalDeviation, i: number) => (
            <div key={i} className="p-1.5 rounded bg-slate-800/30 border border-slate-700/30">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-medium ${severityColor(d.severity)}`}>{d.pattern}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">{d.angleDeg.toFixed(0)}{'\u00B0'}</span>
                  {severityBadge(d.severity)}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{d.region} — {d.clinical}</div>
            </div>
          ))}
        </div>
      )}

      {posture.romRestrictions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-400">ROM Restrictions ({posture.romRestrictions.length})</div>
          {posture.romRestrictions.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] text-slate-400 w-28 truncate">{r.joint} {r.parameter}</span>
              <span className="text-[10px] text-amber-400 w-16">{r.currentDeg.toFixed(0)}{'\u00B0'} / {r.normalDeg.toFixed(0)}{'\u00B0'}</span>
              <span className="text-[10px] text-red-400">-{r.deficitPct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {posture.deviations.length === 0 && posture.romRestrictions.length === 0 && (
        <div className="text-[11px] text-green-400 text-center py-4">Posture within normal limits</div>
      )}
    </div>
  );
}

function MuscleTab({ muscleAsymmetry }: { muscleAsymmetry: BiomechanicsOutput['muscleAsymmetry'] }) {
  const [showAll, setShowAll] = useState(false);
  const abnormal = muscleAsymmetry.muscles.filter((m: MuscleStateEntry) => m.role !== 'normal');
  const displayMuscles = showAll ? muscleAsymmetry.muscles : abnormal.length > 0 ? abnormal : muscleAsymmetry.muscles.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Global Activation</span>
        <span className={`text-sm font-bold ${scoreColor(muscleAsymmetry.globalActivationScore)}`}>
          {muscleAsymmetry.globalActivationScore}%
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Activity className="w-3 h-3" /> Muscle States
        </div>
        {displayMuscles.map((m: MuscleStateEntry, i: number) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="text-[10px] text-slate-400 w-28 truncate">{m.muscle}</span>
            <div className="flex-1 h-1.5 rounded bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded ${m.role === 'overactive' ? 'bg-red-500' : m.role === 'underactive' ? 'bg-amber-500' : m.role === 'inhibited' ? 'bg-red-300' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, m.activationPct)}%` }}
              />
            </div>
            <span className={`text-[10px] w-8 text-right ${roleColor(m.role)}`}>{m.activationPct}%</span>
          </div>
        ))}
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
        >
          {showAll ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {showAll ? 'Show abnormal only' : 'Show all muscles'}
        </button>
      </div>

      {muscleAsymmetry.asymmetries.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3" /> Asymmetries
          </div>
          {muscleAsymmetry.asymmetries.map((a: AsymmetryEntry, i: number) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] text-slate-400 w-24 truncate">{a.region}</span>
              <span className="text-[10px] text-blue-400 w-6">L:{a.leftValue}</span>
              <span className="text-[10px] text-emerald-400 w-6">R:{a.rightValue}</span>
              <span className={`text-[10px] ${severityColor(a.severity)}`}>{a.differencePct}%</span>
              {severityBadge(a.severity)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FaultsTab({
  faults,
  onToggleRule,
  onUpdateThreshold,
  faultRules,
}: {
  faults: BiomechanicsOutput['faults'];
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onUpdateThreshold: (ruleId: string, level: 'thresholdMild' | 'thresholdModerate' | 'thresholdSevere', value: number) => void;
  faultRules: FaultRuleConfig[];
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] text-slate-400">Risk Score</span>
          </div>
          <span className={`text-sm font-bold ${scoreColor(100 - faults.overallRiskScore)}`}>
            {faults.overallRiskScore}/100
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-500">{faults.faultCount} fault(s) detected</span>
          {faults.topFaultCategory && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">{faults.topFaultCategory}</Badge>
          )}
        </div>
      </div>

      {faults.faults.map((f: BiomechanicalFault) => (
        <div key={f.id} className="p-2 rounded bg-slate-800/30 border border-slate-700/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-medium ${severityColor(f.severity)}`}>{f.label}</span>
            <div className="flex items-center gap-1">
              {severityBadge(f.severity)}
              <Badge variant="outline" className="text-[9px] px-1 py-0">{f.category}</Badge>
            </div>
          </div>
          <div className="text-[10px] text-slate-500">
            Measured: {f.measuredValue.toFixed(1)}{f.unit} (threshold: {f.threshold.toFixed(1)}{f.unit})
          </div>
          <div className="text-[10px] text-slate-400">{f.clinical}</div>
          <div className="text-[10px] text-cyan-400/70">Corrective: {f.corrective}</div>
        </div>
      ))}

      {faults.faults.length === 0 && (
        <div className="text-[11px] text-green-400 text-center py-4">No biomechanical faults detected</div>
      )}

      <button
        onClick={() => setShowConfig(!showConfig)}
        className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-1"
      >
        <Layers className="w-3 h-3" />
        {showConfig ? 'Hide' : 'Configure'} fault rules
      </button>

      {showConfig && (
        <div className="space-y-2 p-2 rounded bg-slate-900/50 border border-slate-700/30 max-h-64 overflow-y-auto">
          {faultRules.map(rule => (
            <div key={rule.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => onToggleRule(rule.id, e.target.checked)}
                  className="w-3 h-3 rounded border-slate-600"
                />
                <button
                  onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                  className="text-[10px] text-slate-400 hover:text-slate-300 truncate text-left flex-1"
                >
                  {rule.label}
                </button>
                <span className="text-[9px] text-slate-600 shrink-0">{rule.category}</span>
              </div>
              {expandedRule === rule.id && (
                <div className="pl-5 space-y-1.5 pb-1">
                  {(['thresholdMild', 'thresholdModerate', 'thresholdSevere'] as const).map(level => {
                    const levelLabel = level.replace('threshold', '');
                    const levelColor = level === 'thresholdSevere' ? 'text-red-400' : level === 'thresholdModerate' ? 'text-amber-400' : 'text-blue-400';
                    return (
                      <div key={level} className="flex items-center gap-2">
                        <span className={`text-[9px] w-14 ${levelColor}`}>{levelLabel}</span>
                        <input
                          type="range"
                          min={0}
                          max={rule.unit === '°' ? 45 : 100}
                          step={rule.unit === '°' ? 1 : 0.5}
                          value={rule[level]}
                          onChange={(e) => onUpdateThreshold(rule.id, level, parseFloat(e.target.value))}
                          className="flex-1 h-1 accent-slate-500"
                        />
                        <span className="text-[9px] text-slate-500 w-10 text-right">{rule[level]}{rule.unit}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MovementTab({
  movementTask,
  selectedTaskId,
  progress,
  onTaskChange,
  onProgressChange,
}: {
  movementTask: MovementTaskOutput | null;
  selectedTaskId?: string;
  progress: number;
  onTaskChange: (taskId: string | undefined) => void;
  onProgressChange: (progress: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <PlayCircle className="w-3 h-3" /> Movement Task
        </div>
        <Select
          value={selectedTaskId ?? 'none'}
          onValueChange={(v) => onTaskChange(v === 'none' ? undefined : v)}
        >
          <SelectTrigger className="h-7 text-[11px] bg-slate-800/50 border-slate-700/50">
            <SelectValue placeholder="Select movement..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No movement selected</SelectItem>
            {AVAILABLE_MOVEMENT_TASKS.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTaskId && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Progress</span>
            <span className="text-[10px] text-slate-400">{Math.round(progress * 100)}%</span>
          </div>
          <Slider
            value={[progress * 100]}
            onValueChange={([v]) => onProgressChange(v / 100)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          {movementTask && (
            <div className="text-[10px] text-cyan-400">
              Phase: {movementTask.phase}
            </div>
          )}
        </div>
      )}

      {movementTask && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400">Task Score</span>
            <Badge variant="outline" className={`text-[9px] ${movementTask.taskScore >= 80 ? 'border-green-500/50 text-green-400' : movementTask.taskScore >= 50 ? 'border-amber-500/50 text-amber-400' : 'border-red-500/50 text-red-400'}`}>
              {movementTask.taskScore}/100
            </Badge>
          </div>

          {movementTask.taskFaults.length > 0 && (
            <div className="space-y-1 mb-2">
              <div className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Task Faults ({movementTask.taskFaults.length})
              </div>
              {movementTask.taskFaults.map((f) => (
                <div key={f.id} className="bg-red-500/10 border border-red-500/20 rounded p-1.5">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={`text-[8px] ${f.severity === 'severe' ? 'border-red-500/50 text-red-400' : f.severity === 'moderate' ? 'border-amber-500/50 text-amber-400' : 'border-blue-500/50 text-blue-400'}`}>
                      {f.severity}
                    </Badge>
                    <span className="text-[10px] text-slate-300">{f.label}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{f.description}</div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <div className="text-[11px] text-slate-400">Task Forces</div>
            {movementTask.forces.slice(0, 6).map((f, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className="text-[10px] text-slate-400 w-24 truncate">{f.label}</span>
                <div className="flex-1 h-1.5 rounded bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded bg-cyan-500"
                    style={{ width: `${Math.min(100, f.forcePercent)}%` }}
                  />
                </div>
                <span className="text-[10px] text-cyan-400 w-10 text-right">{f.forcePercent.toFixed(0)}%</span>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-slate-400">Muscle Activation</div>
            {movementTask.muscles.slice(0, 6).map((m, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className="text-[10px] text-slate-400 w-24 truncate">{m.muscle}</span>
                <div className="flex-1 h-1.5 rounded bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded ${m.role === 'agonist' ? 'bg-green-500' : m.role === 'antagonist' ? 'bg-red-400' : m.role === 'stabilizer' ? 'bg-blue-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, m.activationPercent)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 w-10 text-right">{m.activationPercent.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!selectedTaskId && (
        <div className="text-[11px] text-slate-500 text-center py-4">
          Select a movement task to analyze forces and muscle activation through the movement cycle
        </div>
      )}
    </div>
  );
}

function JointKinematicsTab({ kinematics }: { kinematics: JointKinematicsOutput }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <MoveHorizontal className="w-3 h-3" /> Joint Kinematics
        </span>
        <Badge variant="outline" className={`text-[9px] ${kinematics.totalMobilityScore >= 80 ? 'border-green-500/50 text-green-400' : kinematics.totalMobilityScore >= 50 ? 'border-amber-500/50 text-amber-400' : 'border-red-500/50 text-red-400'}`}>
          Mobility: {kinematics.totalMobilityScore}/100
        </Badge>
      </div>

      {kinematics.restrictedJoints.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded p-1.5">
          <div className="text-[10px] text-amber-400">Restricted: {kinematics.restrictedJoints.map(j => j.replace(/_/g, ' ')).join(', ')}</div>
        </div>
      )}

      {kinematics.hypermobileJoints.length > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded p-1.5">
          <div className="text-[10px] text-purple-400">Hypermobile: {kinematics.hypermobileJoints.map(j => j.replace(/_/g, ' ')).join(', ')}</div>
        </div>
      )}

      <div className="space-y-1">
        {kinematics.joints.map((j) => (
          <div key={j.joint} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 capitalize">{j.joint.replace(/_/g, ' ')}</span>
              <span className="text-[9px] text-slate-500">{j.plane}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded bg-slate-700 overflow-hidden relative">
                <div
                  className={`h-full rounded ${j.withinNormal ? 'bg-green-500/60' : 'bg-amber-500/60'}`}
                  style={{ width: `${Math.min(100, Math.max(0, ((j.currentAngleDeg - j.normalRangeDeg[0]) / (j.normalRangeDeg[1] - j.normalRangeDeg[0])) * 100))}%` }}
                />
              </div>
              <span className="text-[9px] text-cyan-400 w-12 text-right">{j.currentAngleDeg}°</span>
            </div>
            <div className="text-[9px] text-slate-500">{j.clinical}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompensationTab({ compensation }: { compensation: CompensationOutput }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <GitBranch className="w-3 h-3" /> Compensation Patterns
        </span>
        <Badge variant="outline" className={`text-[9px] ${compensation.totalCompensationScore <= 20 ? 'border-green-500/50 text-green-400' : compensation.totalCompensationScore <= 50 ? 'border-amber-500/50 text-amber-400' : 'border-red-500/50 text-red-400'}`}>
          Load: {compensation.totalCompensationScore}/100
        </Badge>
      </div>

      {compensation.primaryDrivers.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-1.5">
          <div className="text-[10px] text-red-400">Primary Drivers: {compensation.primaryDrivers.join(', ')}</div>
        </div>
      )}

      {compensation.patterns.length === 0 ? (
        <div className="text-[11px] text-slate-500 text-center py-4">
          No significant compensation patterns detected
        </div>
      ) : (
        <div className="space-y-2">
          {compensation.patterns.map((p) => (
            <div key={p.id} className="bg-slate-800/50 border border-slate-700/50 rounded p-2 space-y-1">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={`text-[8px] ${p.severity === 'severe' ? 'border-red-500/50 text-red-400' : p.severity === 'moderate' ? 'border-amber-500/50 text-amber-400' : 'border-blue-500/50 text-blue-400'}`}>
                  {p.severity}
                </Badge>
                <span className="text-[10px] text-slate-300">{p.label}</span>
              </div>
              <div className="text-[9px] text-slate-500">
                {p.primaryRegion} → {p.compensatingRegion} (+{p.additionalLoadPct}% load)
              </div>
              <div className="text-[9px] text-slate-500">{p.clinical}</div>
              <div className="text-[9px] text-green-400/70">{p.corrective}</div>
            </div>
          ))}
        </div>
      )}

      {compensation.cascadeChains.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] text-slate-400">Cascade Chains</div>
          {compensation.cascadeChains.map((c, i) => (
            <div key={i} className="text-[9px] text-slate-500 bg-slate-800/30 rounded p-1.5">
              <Badge variant="outline" className={`text-[8px] mr-1 ${c.severity === 'severe' ? 'border-red-500/50 text-red-400' : 'border-amber-500/50 text-amber-400'}`}>
                {c.severity}
              </Badge>
              {c.chain.join(' → ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonBar({ comparison }: { comparison: BiomechanicsOutput['comparison'] }) {
  if (!comparison || comparison.entries.length === 0) return null;

  const significantCount = comparison.entries.filter(e => e.significance !== 'negligible').length;
  if (significantCount === 0) return null;

  return (
    <div className="px-3 py-1.5 border-t border-slate-700/50 space-y-1">
      <div className="text-[10px] text-slate-400 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        {comparison.mode === 'left_right' ? 'L/R Comparison' : 'Before/After'}: {significantCount} finding(s)
      </div>
      {comparison.entries.filter(e => e.significance !== 'negligible').slice(0, 3).map((e, i) => (
        <div key={i} className="flex items-center justify-between text-[9px]">
          <span className="text-slate-500 truncate flex-1">{e.parameter}</span>
          <span className={`ml-1 ${e.significance === 'significant' ? 'text-red-400' : 'text-amber-400'}`}>
            {e.deltaPct > 0 ? '+' : ''}{e.deltaPct}%
          </span>
        </div>
      ))}
      <div className="text-[9px] text-slate-500 italic">{comparison.summary}</div>
    </div>
  );
}

export default function UnifiedBiomechanicsPanel({
  output,
  onMovementTaskChange,
  onMovementProgressChange,
  onFaultRuleOverride,
  selectedMovementTask,
  movementProgress = 0.5,
}: UnifiedBiomechanicsPanelProps) {
  const [activeTab, setActiveTab] = useState('faults');
  const [faultRules, setFaultRules] = useState<FaultRuleConfig[]>(() => [...DEFAULT_FAULT_RULES]);

  const handleToggleRule = useCallback((ruleId: string, enabled: boolean) => {
    setFaultRules(prev => {
      const updated = prev.map(r => r.id === ruleId ? { ...r, enabled } : r);
      onFaultRuleOverride(updated.filter(r => {
        const def = DEFAULT_FAULT_RULES.find(d => d.id === r.id);
        return def && def.enabled !== r.enabled;
      }).map(r => ({ id: r.id, enabled: r.enabled })));
      return updated;
    });
  }, [onFaultRuleOverride]);

  const handleUpdateThreshold = useCallback((ruleId: string, level: 'thresholdMild' | 'thresholdModerate' | 'thresholdSevere', value: number) => {
    setFaultRules(prev => {
      const updated = prev.map(r => r.id === ruleId ? { ...r, [level]: value } : r);
      const overrides = updated.filter(r => {
        const def = DEFAULT_FAULT_RULES.find(d => d.id === r.id);
        if (!def) return false;
        return def.enabled !== r.enabled || def.thresholdMild !== r.thresholdMild || def.thresholdModerate !== r.thresholdModerate || def.thresholdSevere !== r.thresholdSevere;
      }).map(r => ({ id: r.id, enabled: r.enabled, thresholdMild: r.thresholdMild, thresholdModerate: r.thresholdModerate, thresholdSevere: r.thresholdSevere }));
      onFaultRuleOverride(overrides);
      return updated;
    });
  }, [onFaultRuleOverride]);

  if (!output) {
    return (
      <div className="p-4 text-[11px] text-slate-500 text-center">
        Biomechanics engine loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/95 text-white">
      <div className="px-3 pt-2 pb-1 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">Biomechanics Engine</span>
        </div>
        <QualityGauge score={output.qualityScore} />
        <div className="text-[10px] text-slate-500 mt-1 leading-tight">{output.clinicalSummary}</div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-1 grid grid-cols-7 h-7 bg-slate-800/50">
          <TabsTrigger value="faults" className="text-[8px] px-0.5 data-[state=active]:bg-slate-700">
            <AlertTriangle className="w-3 h-3 mr-0.5" />
            Faults
            {output.faults.faultCount > 0 && (
              <span className="ml-0.5 text-[7px] bg-red-500/30 text-red-300 px-0.5 rounded-full">
                {output.faults.faultCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="forces" className="text-[8px] px-0.5 data-[state=active]:bg-slate-700">
            <Zap className="w-3 h-3 mr-0.5" />
            Forces
          </TabsTrigger>
          <TabsTrigger value="posture" className="text-[8px] px-0.5 data-[state=active]:bg-slate-700">
            <Layers className="w-3 h-3 mr-0.5" />
            Posture
          </TabsTrigger>
          <TabsTrigger value="muscles" className="text-[8px] px-0.5 data-[state=active]:bg-slate-700">
            <Activity className="w-3 h-3 mr-0.5" />
            Muscle
          </TabsTrigger>
          <TabsTrigger value="kinematics" className="text-[8px] px-0.5 data-[state=active]:bg-slate-700">
            <MoveHorizontal className="w-3 h-3 mr-0.5" />
            ROM
          </TabsTrigger>
          <TabsTrigger value="compensation" className="text-[8px] px-0.5 data-[state=active]:bg-slate-700">
            <GitBranch className="w-3 h-3 mr-0.5" />
            Comp
          </TabsTrigger>
          <TabsTrigger value="movement" className="text-[8px] px-0.5 data-[state=active]:bg-slate-700">
            <PlayCircle className="w-3 h-3 mr-0.5" />
            Task
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3">
            <TabsContent value="faults" className="mt-0">
              <FaultsTab faults={output.faults} onToggleRule={handleToggleRule} onUpdateThreshold={handleUpdateThreshold} faultRules={faultRules} />
            </TabsContent>
            <TabsContent value="forces" className="mt-0">
              <ForceTab forces={output.forces} />
            </TabsContent>
            <TabsContent value="posture" className="mt-0">
              <PostureTab posture={output.posture} />
            </TabsContent>
            <TabsContent value="muscles" className="mt-0">
              <MuscleTab muscleAsymmetry={output.muscleAsymmetry} />
            </TabsContent>
            <TabsContent value="kinematics" className="mt-0">
              <JointKinematicsTab kinematics={output.jointKinematics} />
            </TabsContent>
            <TabsContent value="compensation" className="mt-0">
              <CompensationTab compensation={output.compensationPatterns} />
            </TabsContent>
            <TabsContent value="movement" className="mt-0">
              <MovementTab
                movementTask={output.movementTask}
                selectedTaskId={selectedMovementTask}
                progress={movementProgress}
                onTaskChange={onMovementTaskChange}
                onProgressChange={onMovementProgressChange}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      <ComparisonBar comparison={output.comparison} />
    </div>
  );
}
