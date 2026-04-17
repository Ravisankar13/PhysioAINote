import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Brain,
  ChevronDown,
  ChevronUp,
  Gauge,
  Layers,
  Pill,
  Shield,
  Target,
  Zap,
} from 'lucide-react';
import {
  type TissueIntelligence,
  type TissueEvidence,
  EVIDENCE_SOURCE_LABELS,
  getOverloadColor,
} from '@/lib/tissueIntelligence';

interface TissueIntelligencePanelProps {
  intelligence: TissueIntelligence;
  onSelectCausalChain?: (tissueId: string) => void;
}

function CapacityDemandGauge({ capacity, demand, overloadRatio }: { capacity: number; demand: number; overloadRatio: number }) {
  const color = getOverloadColor(overloadRatio);
  const widthPct = Math.min(100, overloadRatio * 100);
  return (
    <div className="space-y-1.5" data-testid="tissue-capacity-gauge">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground flex items-center gap-1">
          <Gauge className="w-3 h-3" />
          Capacity vs Demand
        </span>
        <span className="font-mono font-bold" style={{ color }}>
          {Math.round(overloadRatio * 100)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden relative">
        <div
          className="absolute top-0 bottom-0 left-0 transition-all"
          style={{ width: `${widthPct}%`, backgroundColor: color }}
        />
        <div className="absolute top-0 bottom-0 w-px bg-foreground/40" style={{ left: '100%' }} />
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span>Capacity {capacity}</span>
        <span>Demand {demand}</span>
      </div>
    </div>
  );
}

function StateRow({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between text-[10px] py-0.5">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <span className="font-medium" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

const LOAD_TOLERANCE_COLOR = {
  high: '#22c55e',
  reduced: '#f59e0b',
  failed: '#ef4444',
};

const IRRITABILITY_COLOR = {
  low: '#22c55e',
  moderate: '#f59e0b',
  high: '#ef4444',
};

const HEALING_COLOR: Record<string, string> = {
  baseline: '#3b82f6',
  acute: '#ef4444',
  subacute: '#f97316',
  chronic: '#a855f7',
  degenerative: '#7f1d1d',
};

function EvidenceItem({ ev }: { ev: TissueEvidence }) {
  return (
    <div className="rounded border border-border/40 bg-muted/30 p-1.5 space-y-0.5">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[8px] h-3.5 px-1 capitalize">
          {EVIDENCE_SOURCE_LABELS[ev.source]}
        </Badge>
        <span className="text-[9px] text-muted-foreground font-mono">
          w{ev.weight.toFixed(2)}
        </span>
      </div>
      <p className="text-[10px] text-foreground/80 leading-tight">{ev.note}</p>
    </div>
  );
}

export default function TissueIntelligencePanel({ intelligence, onSelectCausalChain }: TissueIntelligencePanelProps) {
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const [whyExpanded, setWhyExpanded] = useState(false);

  const i = intelligence;
  const overloadColor = getOverloadColor(i.capacityDemand.overloadRatio);

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-3 space-y-2.5" data-testid={`tissue-intelligence-${i.tissueId}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{i.label}</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{i.region}</Badge>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1"
              style={{ borderColor: overloadColor + '80', color: overloadColor }}
            >
              Severity {Math.round(i.severity * 100)}%
            </Badge>
            <Badge
              variant="secondary"
              className={`text-[9px] h-4 px-1 ${
                i.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                i.confidence === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-muted text-muted-foreground'
              }`}
            >
              {i.confidence} confidence
            </Badge>
            <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">
              {i.structuralFunctional}
            </Badge>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-foreground/80 leading-snug border-l-2 border-primary/40 pl-2">{i.rationale}</p>

      <CapacityDemandGauge
        capacity={i.capacityDemand.capacity}
        demand={i.capacityDemand.demand}
        overloadRatio={i.capacityDemand.overloadRatio}
      />

      <Separator />

      <div className="space-y-0.5">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">State</div>
        <StateRow
          icon={Shield}
          label="Load tolerance"
          value={i.state.loadTolerance}
          color={LOAD_TOLERANCE_COLOR[i.state.loadTolerance]}
        />
        <StateRow
          icon={AlertTriangle}
          label="Irritability"
          value={i.state.irritability}
          color={IRRITABILITY_COLOR[i.state.irritability]}
        />
        <StateRow
          icon={Activity}
          label="Healing stage"
          value={i.state.healingStage}
          color={HEALING_COLOR[i.state.healingStage]}
        />
        <StateRow
          icon={Brain}
          label="Sensitisation"
          value={i.state.sensitisation}
          color={i.state.sensitisation === 'central' ? '#ef4444' : i.state.sensitisation === 'peripheral' ? '#f59e0b' : undefined}
        />
      </div>

      <Separator />

      <div className="space-y-0.5">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Mechanical</div>
        <StateRow icon={Layers} label="Stiffness" value={`${i.mechanical.stiffness}/100`} />
        <StateRow icon={Layers} label="Compliance" value={`${i.mechanical.compliance}/100`} />
        <StateRow
          icon={Gauge}
          label="Load on threshold"
          value={`${i.mechanical.currentLoadPct}%`}
          color={overloadColor}
        />
      </div>

      <Separator />

      <div className="space-y-0.5">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Role & Pain</div>
        <StateRow icon={Target} label="Force role" value={i.forceRole.replace(/_/g, ' ')} />
        <StateRow
          icon={Pill}
          label="Pain generator"
          value={`${i.painGenerator.probability}% (${i.painGenerator.type})`}
          color={i.painGenerator.probability >= 60 ? '#ef4444' : i.painGenerator.probability >= 30 ? '#f59e0b' : undefined}
        />
        <StateRow
          icon={Zap}
          label="Neural drive"
          value={`${Math.round(i.neural.drive)}% / inh ${i.neural.inhibition}%`}
          color={i.neural.reflexGuarding ? '#ef4444' : undefined}
        />
        {i.neural.reflexGuarding && (
          <div className="text-[10px] text-red-400 flex items-center gap-1 pl-4">
            <AlertTriangle className="w-3 h-3" />
            Reflex guarding active
          </div>
        )}
      </div>

      {(i.compensation.upstream.length > 0 || i.compensation.downstream.length > 0) && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Compensation chain</div>
            {i.compensation.upstream.length > 0 && (
              <div className="space-y-1">
                {i.compensation.upstream.map((up, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[10px]">
                    <ArrowUp className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-blue-400 font-medium">{up.region}</span>
                      <span className="text-muted-foreground"> · {up.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {i.compensation.downstream.length > 0 && (
              <div className="space-y-1">
                {i.compensation.downstream.map((dn, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[10px]">
                    <ArrowDown className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-orange-400 font-medium">{dn.region}</span>
                      <span className="text-muted-foreground"> · {dn.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {onSelectCausalChain && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] w-full mt-1"
                onClick={() => onSelectCausalChain(i.tissueId)}
                data-testid={`button-show-causal-${i.tissueId}`}
              >
                Show causal chain on skeleton
              </Button>
            )}
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-1">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Intervention response</div>
        <div className="text-[10px] space-y-0.5">
          <div>
            <span className="text-green-400 font-medium">Responds to: </span>
            <span className="text-foreground/80">{i.intervention.respondsTo.join(', ')}</span>
          </div>
          <div>
            <span className="text-red-400 font-medium">Avoid: </span>
            <span className="text-foreground/80">{i.intervention.poorlyRespondsTo.join(', ')}</span>
          </div>
          <div className="text-muted-foreground">Adaptation: ~{i.intervention.adaptationWeeks} weeks</div>
        </div>
      </div>

      <Separator />

      <button
        className="flex items-center justify-between w-full text-[10px] font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
        onClick={() => setEvidenceExpanded(v => !v)}
        data-testid={`button-evidence-${i.tissueId}`}
      >
        <span>Evidence ({i.evidence.length})</span>
        {evidenceExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {evidenceExpanded && (
        <div className="space-y-1 max-h-40 overflow-y-auto thin-scrollbar">
          {i.evidence.map((ev, idx) => (
            <EvidenceItem key={idx} ev={ev} />
          ))}
        </div>
      )}

      <button
        className="flex items-center justify-between w-full text-[10px] font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
        onClick={() => setWhyExpanded(v => !v)}
        data-testid={`button-why-${i.tissueId}`}
      >
        <span>Why this matters</span>
        {whyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {whyExpanded && (
        <div className="text-[10px] text-foreground/80 leading-snug space-y-1 bg-muted/20 rounded p-2">
          <p>
            This tissue shows a <strong>{i.state.loadTolerance}</strong> load tolerance with{' '}
            <strong>{i.state.irritability}</strong> irritability in the{' '}
            <strong>{i.state.healingStage}</strong> stage.
          </p>
          <p>
            Demand currently exceeds capacity by <strong>{Math.round(Math.max(0, (i.capacityDemand.overloadRatio - 1) * 100))}%</strong>.
            {i.capacityDemand.overloadRatio > 1 && ' Without intervention, expect symptom progression and downstream cascade.'}
          </p>
          <p>
            Pain generator probability is <strong>{i.painGenerator.probability}%</strong> ({i.painGenerator.type}).
            {i.structuralFunctional === 'structural' && ' Structural changes present — focus on capacity-building.'}
            {i.structuralFunctional === 'functional' && ' Primarily motor control — focus on neuromotor retraining.'}
            {i.structuralFunctional === 'mixed' && ' Mixed structural and functional — combined approach indicated.'}
          </p>
        </div>
      )}
    </div>
  );
}
