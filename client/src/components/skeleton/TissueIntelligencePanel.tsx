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
  type PainBehavior,
  type AggravatorEntry,
  type CandidateGenerator,
  type DiurnalPattern,
  type PainLatency,
  EVIDENCE_SOURCE_LABELS,
  getOverloadColor,
} from '@/lib/tissueIntelligence';

const SIN_COLOR = { low: '#22c55e', moderate: '#f59e0b', high: '#ef4444' };

const DIURNAL_LABELS: Record<DiurnalPattern, string> = {
  morning_stiffness: 'Morning stiffness',
  end_of_day: 'Worsens through the day',
  night_pain: 'Night pain',
  constant: 'Constant',
  activity_dependent: 'Activity-dependent',
  unknown: 'Pattern not yet known',
};

const LATENCY_LABELS: Record<PainLatency, string> = {
  immediate: 'Immediate onset',
  within_minutes: 'Within minutes',
  next_day: 'Delayed (next day)',
  unknown: 'Latency unknown',
};

const AGGRAVATOR_KIND_COLOR: Record<AggravatorEntry['kind'], string> = {
  movement: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  position: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  load: 'bg-red-500/15 text-red-300 border-red-500/30',
  environment: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] text-muted-foreground italic">{children}</div>;
}

function DescriptorChip({ label, source }: { label: string; source: string }) {
  return (
    <span
      className="text-[9px] px-1.5 h-4 rounded-full bg-muted/60 text-foreground/80 border border-border/60 capitalize inline-flex items-center"
      data-testid={`descriptor-${label}`}
      title={`Pain descriptor · Source: ${source}`}
    >
      {label}
    </span>
  );
}

function CandidateRow({ c }: { c: CandidateGenerator }) {
  const pct = Math.round(c.probability * 100);
  const color = pct >= 60 ? '#ef4444' : pct >= 35 ? '#f59e0b' : '#94a3b8';
  const tip = `${c.rationale} · Source: ${EVIDENCE_SOURCE_LABELS[c.source]}`;
  return (
    <div className="flex items-start gap-2 py-0.5" title={tip}>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-foreground/90 truncate flex items-center gap-1">
          <span className="truncate">{c.label}</span>
          <span className="text-[8px] text-muted-foreground/70 shrink-0">[{EVIDENCE_SOURCE_LABELS[c.source]}]</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden mt-0.5">
          <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
      <span className="font-mono text-[9px] mt-0.5" style={{ color }}>{pct}%</span>
    </div>
  );
}

function AggravatorChip({ ag }: { ag: AggravatorEntry }) {
  const cls = AGGRAVATOR_KIND_COLOR[ag.kind] ?? AGGRAVATOR_KIND_COLOR.movement;
  const titleParts: string[] = [`Source: ${EVIDENCE_SOURCE_LABELS[ag.source]}`];
  if (ag.predicate && ag.predicate.kind !== 'always') {
    titleParts.push(`Triggers when current pose matches: ${ag.predicate.kind} (${'threshold' in ag.predicate ? ag.predicate.threshold + '°' : ''})`);
  }
  return (
    <span
      className={`text-[9px] px-1.5 h-4 rounded-full border inline-flex items-center gap-1 capitalize ${cls}`}
      title={titleParts.join(' · ')}
      data-testid={`aggravator-${ag.label}`}
    >
      <span className="opacity-70">{ag.kind}:</span>
      <span className="normal-case">{ag.label}</span>
      {ag.predicate && ag.predicate.kind !== 'always' && <span className="opacity-70">●</span>}
    </span>
  );
}

function CollapsibleSection({
  title,
  tooltip,
  children,
  defaultOpen = true,
  testId,
}: {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  testId?: string;
}) {
  return (
    <details open={defaultOpen} className="group" data-testid={testId}>
      <summary
        className="flex items-center justify-between cursor-pointer select-none list-none text-[10px] font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
        title={tooltip}
      >
        <span>{title}</span>
        <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-1.5 mt-1.5">{children}</div>
    </details>
  );
}

function PainBehaviorSections({ pb, label, evidence }: { pb?: PainBehavior; label: string; evidence: TissueEvidence[] }) {
  const hasCandidates = !!pb && pb.candidates.length > 0;
  const hasDescriptors = !!pb && pb.descriptors.length > 0;
  const hasAggravators = !!pb && pb.aggravators.length > 0;
  const hasEasers = !!pb && pb.easers.length > 0;
  // SIN is always derivable, so the behaviour grid always renders when we have a
  // painBehavior at all. Diurnal/latency cards still display "unknown" labels gracefully.
  const hasBehaviour = !!pb;

  const findSource = (kw: string): string => {
    const hit = evidence.find(e => e.note.toLowerCase().includes(kw.toLowerCase()));
    return EVIDENCE_SOURCE_LABELS[hit?.source ?? 'pain_behavior_default'];
  };
  const descriptorsSource = findSource('descriptor');
  const sinSource = findSource('SIN level computed');
  const diurnalSource = findSource('24-hour pattern');
  const latencySource = findSource('Onset latency');
  const easerSource = findSource('Easer:');

  return (
    <>
      <Separator />
      <CollapsibleSection
        title="What hurts"
        tooltip="Ranked candidate pain generators with provenance. All items appear in the Evidence accordion."
        testId="section-what-hurts"
      >
        {hasCandidates ? (
          <div className="space-y-1">
            {pb!.candidates.map((c, i) => <CandidateRow key={i} c={c} />)}
          </div>
        ) : (
          <EmptyHint>Primary candidate: {label}. No source-backed generators yet — not yet observed.</EmptyHint>
        )}
        {hasDescriptors ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {pb!.descriptors.map(d => <DescriptorChip key={d} label={d} source={descriptorsSource} />)}
          </div>
        ) : (
          <EmptyHint>Descriptors not yet observed.</EmptyHint>
        )}
      </CollapsibleSection>

      <Separator />
      <CollapsibleSection
        title="How it behaves"
        tooltip="Severity-irritability-nature, 24h pattern, and onset latency."
        testId="section-how-it-behaves"
      >
        {hasBehaviour ? (
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded border border-border/40 bg-muted/30 p-1.5" title={`Severity-Irritability-Nature · Source: ${sinSource}`}>
              <div className="text-[9px] text-muted-foreground">SIN</div>
              <div className="text-[10px] font-semibold capitalize" style={{ color: SIN_COLOR[pb!.sin] }}>{pb!.sin}</div>
              <div className="text-[8px] text-muted-foreground/70 truncate">[{sinSource}]</div>
            </div>
            <div className="rounded border border-border/40 bg-muted/30 p-1.5" title={`24h pattern · Source: ${diurnalSource}`}>
              <div className="text-[9px] text-muted-foreground">24h pattern</div>
              <div className="text-[10px] font-medium leading-tight">{DIURNAL_LABELS[pb!.diurnal]}</div>
              <div className="text-[8px] text-muted-foreground/70 truncate">[{diurnalSource}]</div>
            </div>
            <div className="rounded border border-border/40 bg-muted/30 p-1.5" title={`Onset latency · Source: ${latencySource}`}>
              <div className="text-[9px] text-muted-foreground">Onset</div>
              <div className="text-[10px] font-medium leading-tight">{LATENCY_LABELS[pb!.latency]}</div>
              <div className="text-[8px] text-muted-foreground/70 truncate">[{latencySource}]</div>
            </div>
          </div>
        ) : (
          <EmptyHint>Behaviour not yet observed.</EmptyHint>
        )}
      </CollapsibleSection>

      <Separator />
      <CollapsibleSection
        title="When it's triggered"
        tooltip="Position / movement / load / environment triggers. Predicate chips (●) flash a pip on the 3D model when the current pose matches."
        testId="section-when-triggered"
      >
        {hasAggravators ? (
          <div className="flex flex-wrap gap-1">
            {pb!.aggravators.map((ag, i) => <AggravatorChip key={i} ag={ag} />)}
          </div>
        ) : (
          <EmptyHint>No aggravators identified yet.</EmptyHint>
        )}
        {hasEasers ? (
          <div className="pt-1">
            <div className="text-[9px] text-muted-foreground mb-0.5" title="Eases this tissue. Source visible in Evidence accordion.">Easers</div>
            <div className="flex flex-wrap gap-1">
              {pb!.easers.map((e, i) => (
                <span key={i} className="text-[9px] px-1.5 h-4 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center" title={`Easer · Source: ${easerSource}`}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <EmptyHint>Easers not yet observed.</EmptyHint>
        )}
      </CollapsibleSection>
    </>
  );
}

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

      <PainBehaviorSections pb={i.painBehavior} label={i.label} evidence={i.evidence} />

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
