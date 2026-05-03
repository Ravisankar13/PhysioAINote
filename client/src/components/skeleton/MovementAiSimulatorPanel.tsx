import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles, Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, XCircle, MinusCircle,
  ArrowUp, ArrowDown, Equal, RotateCcw, RefreshCw,
  GripVertical,
} from 'lucide-react';
import { MUSCLE_TARGETS, JOINT_TARGETS } from '@/lib/whatIfSimulationEngine';

const SLING_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'posterior_oblique', label: 'Posterior Oblique' },
  { id: 'anterior_oblique', label: 'Anterior Oblique' },
  { id: 'lateral', label: 'Lateral' },
  { id: 'deep_longitudinal', label: 'Deep Longitudinal' },
  { id: 'scapular_shoulder', label: 'Scapular / Shoulder' },
];

const ROM_DIRECTIONS_BY_JOINT: Record<string, string[]> = {
  leftShoulder:  ['flexion', 'abduction', 'externalRotation', 'internalRotation', 'extension'],
  rightShoulder: ['flexion', 'abduction', 'externalRotation', 'internalRotation', 'extension'],
  leftElbow:  ['flexion'],
  rightElbow: ['flexion'],
  leftWrist:  ['flexion', 'extension'],
  rightWrist: ['flexion', 'extension'],
  leftHip:    ['flexion', 'abduction', 'internalRotation', 'extension'],
  rightHip:   ['flexion', 'abduction', 'internalRotation', 'extension'],
  leftKnee:   ['flexion'],
  rightKnee:  ['flexion'],
  leftAnkle:  ['dorsiflexion', 'plantarflexion', 'inversion'],
  rightAnkle: ['dorsiflexion', 'plantarflexion', 'inversion'],
  spine: ['flexion', 'extension', 'rotation', 'lateralFlexion'],
  neck:  ['flexion', 'extension', 'rotation', 'lateralFlexion'],
};

type MuscleRegion = 'Lower limb' | 'Upper limb' | 'Trunk / Spine' | 'Neck';
type JointRegion = 'Lower limb' | 'Upper limb' | 'Spine / Neck';

function muscleRegion(id: string): MuscleRegion {
  if (/^(glute|quad|hamstring|hip_flexor|adductor|piriformis|calf|peroneal|tib_post|shin)/.test(id)) return 'Lower limb';
  if (/^(scapula|rotator_cuff|deltoid|bicep|tricep|wrist_flex|wrist_ext|chest)/.test(id)) return 'Upper limb';
  if (/^(scm|suboccipitals|levator_scapulae|scalenes|neck)/.test(id)) return 'Neck';
  return 'Trunk / Spine';
}
function jointRegion(id: string): JointRegion {
  if (/Hip|Knee|Ankle/.test(id)) return 'Lower limb';
  if (/Shoulder|Elbow|Wrist/.test(id)) return 'Upper limb';
  return 'Spine / Neck';
}

function groupByRegion<T extends { id: string }>(
  items: T[], regionFn: (id: string) => string,
): Array<{ region: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const r = regionFn(it.id);
    if (!map.has(r)) map.set(r, []);
    map.get(r)!.push(it);
  }
  return Array.from(map.entries()).map(([region, items]) => ({ region, items }));
}

const GROUPED_MUSCLES = groupByRegion(MUSCLE_TARGETS, muscleRegion);
const GROUPED_JOINTS = groupByRegion(JOINT_TARGETS, jointRegion);

type InterventionKind =
  | 'strengthen' | 'inhibit' | 'lengthen' | 'shorten'
  | 'restoreROM' | 'restrictROM' | 'changeSling' | 'other';

const KIND_OPTIONS: Array<{ id: InterventionKind; label: string; needs: 'muscle' | 'joint' | 'sling' | 'free' }> = [
  { id: 'strengthen',  label: 'Strengthen muscle',     needs: 'muscle' },
  { id: 'inhibit',     label: 'Inhibit / down-regulate muscle', needs: 'muscle' },
  { id: 'lengthen',    label: 'Lengthen muscle',       needs: 'muscle' },
  { id: 'shorten',     label: 'Shorten muscle',        needs: 'muscle' },
  { id: 'restoreROM',  label: 'Restore joint ROM',     needs: 'joint' },
  { id: 'restrictROM', label: 'Restrict joint ROM',    needs: 'joint' },
  { id: 'changeSling', label: 'Change sling activation', needs: 'sling' },
  { id: 'other',       label: 'Other (free text)',     needs: 'free' },
];

type Magnitude = 'small' | 'moderate' | 'large';

const MAGNITUDE_VALUES: Record<InterventionKind, Record<Magnitude, { magnitude: number; unit: string }>> = {
  strengthen:  { small: { magnitude: 10, unit: '%' }, moderate: { magnitude: 25, unit: '%' }, large: { magnitude: 40, unit: '%' } },
  inhibit:     { small: { magnitude: 10, unit: '%' }, moderate: { magnitude: 25, unit: '%' }, large: { magnitude: 40, unit: '%' } },
  lengthen:    { small: { magnitude: 5,  unit: '°' }, moderate: { magnitude: 10, unit: '°' }, large: { magnitude: 20, unit: '°' } },
  shorten:     { small: { magnitude: 5,  unit: '°' }, moderate: { magnitude: 10, unit: '°' }, large: { magnitude: 20, unit: '°' } },
  restoreROM:  { small: { magnitude: 5,  unit: '°' }, moderate: { magnitude: 15, unit: '°' }, large: { magnitude: 30, unit: '°' } },
  restrictROM: { small: { magnitude: 5,  unit: '°' }, moderate: { magnitude: 15, unit: '°' }, large: { magnitude: 30, unit: '°' } },
  changeSling: { small: { magnitude: 10, unit: '%' }, moderate: { magnitude: 20, unit: '%' }, large: { magnitude: 35, unit: '%' } },
  other:       { small: { magnitude: 0,  unit: '' },  moderate: { magnitude: 0,  unit: '' },  large: { magnitude: 0,  unit: '' } },
};
// Free-text ("other") interventions intentionally omit a magnitude band:
// the user-supplied note carries the dose nuance and there is no canonical
// engine target to scale, so a magnitude picker would be meaningless.

export interface Intervention {
  uid: string;
  kind: InterventionKind;
  target?: string;
  magnitudeBand: Magnitude;
  romDirection?: string;
  slingId?: string;
  slingDirection?: 'increase' | 'decrease';
  freeText?: string;
}

export function describeIntervention(i: Intervention): string {
  const meta = KIND_OPTIONS.find(k => k.id === i.kind);
  const action = meta?.label ?? i.kind;
  if (i.kind === 'changeSling') {
    const sl = SLING_OPTIONS.find(s => s.id === i.slingId)?.label ?? i.slingId ?? 'sling';
    const dir = i.slingDirection === 'decrease' ? 'decrease' : 'increase';
    const m = MAGNITUDE_VALUES[i.kind][i.magnitudeBand];
    return `${dir} ${sl} (${i.magnitudeBand} ±${m.magnitude}${m.unit})`;
  }
  if (i.kind === 'restoreROM' || i.kind === 'restrictROM') {
    const j = JOINT_TARGETS.find(t => t.id === i.target)?.label ?? i.target ?? 'joint';
    const dir = i.romDirection ? ` ${i.romDirection}` : '';
    const m = MAGNITUDE_VALUES[i.kind][i.magnitudeBand];
    return `${action.toLowerCase()}: ${j}${dir} (${i.magnitudeBand} ±${m.magnitude}${m.unit})`;
  }
  if (i.kind === 'other') {
    return (i.freeText || 'free-text').slice(0, 80);
  }
  const mu = MUSCLE_TARGETS.find(t => t.id === i.target)?.label ?? i.target ?? 'muscle';
  const m = MAGNITUDE_VALUES[i.kind][i.magnitudeBand];
  return `${action.toLowerCase()}: ${mu} (${i.magnitudeBand} ±${m.magnitude}${m.unit})`;
}

export interface MovementSimResult {
  biomechanicalChanges: string[];
  slingRebalancing: Array<{ slingId: string; directionPct: number; note: string }>;
  compensationShift: string[];
  tissueLoadImpact: Array<{
    tissue: string;
    loadDirection: 'up' | 'down' | 'neutral';
    magnitude: 'small' | 'moderate' | 'large';
    symptomDirection: 'improve' | 'worsen' | 'neutral';
    mechanism: string;
  }>;
  netVerdict: 'helpful' | 'mixed' | 'harmful' | 'neutral';
  verdictRationale: string;
  confidence: 'low' | 'moderate' | 'high';
  confidenceReason: string;
  caveats: string[];
  hash: string;
  cached: boolean;
}

export interface ActiveCapacityRowSlim {
  joint: string;
  movement: string;
  activeRom?: [number, number];
  painfulArc?: [number, number];
  activeStrengthPct?: number;
}

export interface MovementSimContext {
  condition: string;
  caseSummary: string;
  painfulTissues: Array<{ label: string; severity?: number; type?: string; irritability?: 'low' | 'moderate' | 'high' }>;
  postureDeviations: string[];
  slingActivations: Array<{ slingId: string; activation: number }>;
  hudForceSummary: string;
  activeCapacityProfile: ActiveCapacityRowSlim[];
}

export interface MovementAiSimulatorPanelProps {
  context: MovementSimContext;
  onResult: (result: MovementSimResult, plan: Intervention[]) => void;
  onReset?: () => void;
  className?: string;
  /** Increment to request the panel expand and scroll into view. */
  expandSignal?: number;
}

function newId() { return `iv-${Date.now()}-${Math.floor(Math.random() * 1000)}`; }
function defaultIntervention(): Intervention {
  return { uid: newId(), kind: 'strengthen', target: 'glute_l', magnitudeBand: 'moderate' };
}

const VERDICT_STYLES: Record<MovementSimResult['netVerdict'], { bg: string; border: string; text: string; Icon: typeof CheckCircle2 }> = {
  helpful:  { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50', text: 'text-emerald-200', Icon: CheckCircle2 },
  mixed:    { bg: 'bg-amber-900/40',   border: 'border-amber-500/50',   text: 'text-amber-200',   Icon: AlertTriangle },
  harmful:  { bg: 'bg-rose-900/40',    border: 'border-rose-500/50',    text: 'text-rose-200',    Icon: XCircle },
  neutral:  { bg: 'bg-slate-800/60',   border: 'border-slate-600/50',   text: 'text-slate-200',   Icon: MinusCircle },
};

const LOAD_ICON: Record<MovementSimResult['tissueLoadImpact'][number]['loadDirection'], typeof ArrowUp> = {
  up: ArrowUp, down: ArrowDown, neutral: Equal,
};
const LOAD_TINT: Record<MovementSimResult['tissueLoadImpact'][number]['loadDirection'], string> = {
  up: 'text-rose-300', down: 'text-emerald-300', neutral: 'text-slate-300',
};
const SYMPTOM_TINT: Record<MovementSimResult['tissueLoadImpact'][number]['symptomDirection'], string> = {
  improve: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  worsen:  'bg-rose-500/20 text-rose-200 border-rose-400/40',
  neutral: 'bg-slate-700/40 text-slate-200 border-slate-500/40',
};

const MAGNITUDE_BANDS: Magnitude[] = ['small', 'moderate', 'large'];

export default function MovementAiSimulatorPanel({ context, onResult, onReset, className = '', expandSignal }: MovementAiSimulatorPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastExpandSignalRef = useRef<number | undefined>(expandSignal);
  useEffect(() => {
    if (expandSignal === undefined) return;
    if (lastExpandSignalRef.current === expandSignal) return;
    lastExpandSignalRef.current = expandSignal;
    setCollapsed(false);
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [expandSignal]);

  // Drag-to-move (mirrors the pattern used by ClinicalReasoningPanel).
  // Default: panel is a normal flow child of the right-rail in PhysioGPT.
  // Once the user grabs the header, we switch to position:fixed and let the
  // user place the panel anywhere within the viewport.
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const PANEL_W = 340;
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Skip drag if the user clicked on an interactive control inside the
    // header (e.g. the chevron collapse/expand button or the verdict pill).
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select, [role="radio"], [role="button"]')) return;
    e.preventDefault();
    const panelEl = rootRef.current;
    if (!panelEl) return;
    const rect = panelEl.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // Seed dragPos with the panel's current viewport position so the first
    // mousemove doesn't jump it across the screen.
    setDragPos({ left: rect.left, top: rect.top });
    setIsDragging(true);
  }, []);
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      let left = e.clientX - dragOffset.current.x;
      let top = e.clientY - dragOffset.current.y;
      // Clamp so the panel stays on-screen and below the top app bar (~64px).
      left = Math.max(8, Math.min(left, window.innerWidth - PANEL_W - 8));
      top = Math.max(64, Math.min(top, window.innerHeight - 80));
      setDragPos({ left, top });
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);
  const panelStyle: React.CSSProperties = dragPos
    ? {
        position: 'fixed',
        left: dragPos.left,
        top: dragPos.top,
        right: 'auto',
        width: PANEL_W,
        zIndex: 50,
        maxHeight: `calc(100vh - ${dragPos.top + 16}px)`,
      }
    : { maxHeight: 'calc(100vh - 6rem)' };
  const [interventions, setInterventions] = useState<Intervention[]>([defaultIntervention()]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MovementSimResult | null>(null);
  const lastBodyRef = useRef<unknown>(null);
  const lastPlanRef = useRef<Intervention[] | null>(null);

  const updateIntervention = useCallback((uid: string, patch: Partial<Intervention>) => {
    setInterventions(prev => prev.map(i => i.uid === uid ? { ...i, ...patch } : i));
  }, []);
  const removeIntervention = useCallback((uid: string) => {
    setInterventions(prev => prev.length <= 1 ? prev : prev.filter(i => i.uid !== uid));
  }, []);
  const addIntervention = useCallback(() => {
    setInterventions(prev => prev.length >= 6 ? prev : [...prev, defaultIntervention()]);
  }, []);
  const resetAll = useCallback(() => {
    setInterventions([defaultIntervention()]);
    setResult(null);
    setError(null);
    lastBodyRef.current = null;
    lastPlanRef.current = null;
    onReset?.();
  }, [onReset]);
  const onKindChange = useCallback((uid: string, kind: InterventionKind) => {
    const meta = KIND_OPTIONS.find(k => k.id === kind)!;
    const patch: Partial<Intervention> = { kind, target: undefined, slingId: undefined, freeText: undefined, romDirection: undefined, magnitudeBand: 'moderate' };
    if (meta.needs === 'muscle')      patch.target = MUSCLE_TARGETS[0].id;
    else if (meta.needs === 'joint') {
      patch.target = JOINT_TARGETS[0].id;
      patch.romDirection = ROM_DIRECTIONS_BY_JOINT[JOINT_TARGETS[0].id]?.[0];
    } else if (meta.needs === 'sling') {
      patch.slingId = SLING_OPTIONS[0].id;
      patch.slingDirection = 'increase';
    }
    updateIntervention(uid, patch);
  }, [updateIntervention]);
  const onJointChange = useCallback((uid: string, target: string) => {
    updateIntervention(uid, { target, romDirection: ROM_DIRECTIONS_BY_JOINT[target]?.[0] });
  }, [updateIntervention]);

  const canRun = useMemo(() => {
    if (interventions.length === 0) return false;
    return interventions.every(i => {
      const meta = KIND_OPTIONS.find(k => k.id === i.kind);
      if (!meta) return false;
      if (meta.needs === 'muscle') return !!i.target;
      if (meta.needs === 'joint')  return !!i.target;
      if (meta.needs === 'sling')  return !!i.slingId;
      if (meta.needs === 'free')   return !!(i.freeText && i.freeText.trim().length > 0);
      return true;
    });
  }, [interventions]);

  const buildBody = useCallback(() => {
    return {
      condition: context.condition,
      caseSummary: context.caseSummary,
      painfulTissues: context.painfulTissues,
      postureDeviations: context.postureDeviations,
      slingActivations: context.slingActivations,
      hudForceSummary: context.hudForceSummary,
      activeCapacityProfile: context.activeCapacityProfile,
      interventions: interventions.map(i => {
        const out: Record<string, unknown> = { kind: i.kind };
        const mag = MAGNITUDE_VALUES[i.kind][i.magnitudeBand];
        if (i.target) out.target = i.target;
        if ((i.kind === 'restoreROM' || i.kind === 'restrictROM') && i.romDirection) {
          out.romDirection = i.romDirection;
        }
        if (i.slingId) out.slingId = i.slingId;
        if (i.kind === 'changeSling') {
          out.slingDirection = i.slingDirection ?? 'increase';
        }
        if (mag.magnitude) out.magnitude = mag.magnitude;
        if (mag.unit)      out.unit = mag.unit;
        if (i.freeText)    out.freeText = i.freeText;
        return out;
      }),
    };
  }, [context, interventions]);

  const runSim = useCallback(async (override?: { body: unknown; plan: Intervention[] }) => {
    if (!override && (!canRun || running)) return;
    if (override && running) return;
    setRunning(true);
    setError(null);
    const planSnapshot = override?.plan ?? interventions.map(i => ({ ...i }));
    const body = override?.body ?? buildBody();
    lastBodyRef.current = body;
    lastPlanRef.current = planSnapshot;
    try {
      const res = await fetch('/api/movement-sim/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Request failed (${res.status})`);
      }
      const data = await res.json() as MovementSimResult;
      setResult(data);
      onResult(data, planSnapshot);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to run prediction';
      setError(msg);
    } finally {
      setRunning(false);
    }
  }, [canRun, running, buildBody, onResult, interventions]);

  const rerun = useCallback(() => {
    if (lastBodyRef.current && lastPlanRef.current) {
      runSim({ body: lastBodyRef.current, plan: lastPlanRef.current });
    } else {
      runSim();
    }
  }, [runSim]);

  const ChevIcon = collapsed ? ChevronDown : ChevronUp;

  return (
    <Card
      ref={rootRef}
      className={`bg-indigo-950/55 border-indigo-700/50 text-indigo-50 flex flex-col overflow-hidden ${className}`}
      style={panelStyle}
      data-testid="movement-ai-simulator-panel"
    >
      <div
        className={`shrink-0 w-full flex items-center justify-between p-3 select-none hover:bg-indigo-900/40 transition-colors ${collapsed ? '' : 'border-b border-indigo-700/40'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleDragStart}
        title="Drag to move"
        data-testid="movement-sim-header"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-3 w-3 text-indigo-400/70" />
          <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Movement AI Simulator</div>
          {result && (
            <span
              className={`text-[9px] uppercase tracking-wider rounded border px-1.5 py-0.5 ${VERDICT_STYLES[result.netVerdict].bg} ${VERDICT_STYLES[result.netVerdict].border} ${VERDICT_STYLES[result.netVerdict].text}`}
              data-testid="verdict-pill"
            >
              {result.netVerdict}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="rounded p-0.5 hover:bg-indigo-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand simulator' : 'Collapse simulator'}
          data-testid="movement-sim-toggle"
        >
          <ChevIcon className="h-3.5 w-3.5 text-indigo-300" />
        </button>
      </div>

      {!collapsed && (
        <ScrollArea className="flex-1 min-h-0" data-testid="movement-sim-body">
          <div className="p-3 space-y-3">
            <div className="space-y-2">
              {interventions.map((iv, idx) => {
                const meta = KIND_OPTIONS.find(k => k.id === iv.kind)!;
                const romDirs = iv.target ? ROM_DIRECTIONS_BY_JOINT[iv.target] || [] : [];
                return (
                  <div
                    key={iv.uid}
                    className="rounded-md bg-indigo-900/40 border border-indigo-700/40 p-2 space-y-1.5"
                    data-testid={`intervention-row-${idx}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-wide text-indigo-300/80 w-6">#{idx + 1}</span>
                      <Select value={iv.kind} onValueChange={(v) => onKindChange(iv.uid, v as InterventionKind)}>
                        <SelectTrigger className="h-7 text-[11px] bg-indigo-950/70 border-indigo-700/50 flex-1" data-testid={`intervention-kind-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KIND_OPTIONS.map(k => (
                            <SelectItem key={k.id} value={k.id} className="text-[11px]">{k.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {interventions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIntervention(iv.uid)}
                          className="shrink-0 rounded p-1 text-indigo-300/70 hover:bg-indigo-800/60 hover:text-rose-200"
                          title="Remove intervention"
                          data-testid={`intervention-remove-${idx}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {meta.needs === 'muscle' && (
                      <Select value={iv.target} onValueChange={(v) => updateIntervention(iv.uid, { target: v })}>
                        <SelectTrigger className="h-7 text-[11px] bg-indigo-950/70 border-indigo-700/50" data-testid={`intervention-target-${idx}`}>
                          <SelectValue placeholder="Muscle…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[280px]">
                          {GROUPED_MUSCLES.map(g => (
                            <SelectGroup key={g.region}>
                              <SelectLabel className="text-[10px] uppercase tracking-wider text-indigo-300/80">{g.region}</SelectLabel>
                              {g.items.map(m => (
                                <SelectItem key={m.id} value={m.id} className="text-[11px]">{m.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {meta.needs === 'joint' && (
                      <div className="flex items-center gap-1.5">
                        <Select value={iv.target} onValueChange={(v) => onJointChange(iv.uid, v)}>
                          <SelectTrigger className="h-7 text-[11px] bg-indigo-950/70 border-indigo-700/50 flex-1" data-testid={`intervention-target-${idx}`}>
                            <SelectValue placeholder="Joint…" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[280px]">
                            {GROUPED_JOINTS.map(g => (
                              <SelectGroup key={g.region}>
                                <SelectLabel className="text-[10px] uppercase tracking-wider text-indigo-300/80">{g.region}</SelectLabel>
                                {g.items.map(j => (
                                  <SelectItem key={j.id} value={j.id} className="text-[11px]">{j.label}</SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                        {romDirs.length > 0 && (
                          <Select value={iv.romDirection} onValueChange={(v) => updateIntervention(iv.uid, { romDirection: v })}>
                            <SelectTrigger className="h-7 text-[11px] bg-indigo-950/70 border-indigo-700/50 w-[120px]" data-testid={`intervention-rom-direction-${idx}`}>
                              <SelectValue placeholder="Direction…" />
                            </SelectTrigger>
                            <SelectContent>
                              {romDirs.map(d => (
                                <SelectItem key={d} value={d} className="text-[11px] capitalize">{d.replace(/([A-Z])/g, ' $1').toLowerCase()}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    {meta.needs === 'sling' && (
                      <div className="space-y-1.5">
                        <Select value={iv.slingId} onValueChange={(v) => updateIntervention(iv.uid, { slingId: v })}>
                          <SelectTrigger className="h-7 text-[11px] bg-indigo-950/70 border-indigo-700/50" data-testid={`intervention-sling-${idx}`}>
                            <SelectValue placeholder="Sling…" />
                          </SelectTrigger>
                          <SelectContent>
                            {SLING_OPTIONS.map(s => (
                              <SelectItem key={s.id} value={s.id} className="text-[11px]">{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1" role="radiogroup" aria-label="Direction" data-testid={`intervention-sling-direction-${idx}`}>
                          {(['increase','decrease'] as const).map(d => {
                            const active = (iv.slingDirection ?? 'increase') === d;
                            const Icon = d === 'increase' ? ArrowUp : ArrowDown;
                            return (
                              <button
                                key={d}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => updateIntervention(iv.uid, { slingDirection: d })}
                                className={`flex-1 inline-flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide rounded border px-1.5 py-1 transition-colors ${
                                  active
                                    ? 'bg-indigo-600 border-indigo-400 text-white'
                                    : 'bg-indigo-950/60 border-indigo-700/50 text-indigo-200 hover:bg-indigo-800/60'
                                }`}
                                data-testid={`intervention-sling-direction-${idx}-${d}`}
                              >
                                <Icon className="h-3 w-3" /> {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {meta.needs === 'free' && (
                      <Textarea
                        value={iv.freeText ?? ''}
                        onChange={(e) => updateIntervention(iv.uid, { freeText: e.target.value })}
                        placeholder="e.g. Add 5° heel-lift bilaterally; reduce running cadence by 8%…"
                        className="min-h-[44px] text-[11px] bg-indigo-950/70 border-indigo-700/50"
                        data-testid={`intervention-freetext-${idx}`}
                      />
                    )}

                    {meta.needs !== 'free' && (
                      <div className="flex items-center gap-1" role="radiogroup" aria-label="Magnitude" data-testid={`intervention-magnitude-${idx}`}>
                        {MAGNITUDE_BANDS.map(band => {
                          const active = iv.magnitudeBand === band;
                          const v = MAGNITUDE_VALUES[iv.kind][band];
                          return (
                            <button
                              key={band}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => updateIntervention(iv.uid, { magnitudeBand: band })}
                              className={`flex-1 text-[10px] uppercase tracking-wide rounded border px-1.5 py-1 transition-colors ${
                                active
                                  ? 'bg-indigo-600 border-indigo-400 text-white'
                                  : 'bg-indigo-950/60 border-indigo-700/50 text-indigo-200 hover:bg-indigo-800/60'
                              }`}
                              data-testid={`intervention-magnitude-${idx}-${band}`}
                            >
                              {band}
                              <span className="ml-1 text-[9px] text-indigo-300/80 normal-case">±{v.magnitude}{v.unit}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={addIntervention}
                    disabled={interventions.length >= 6}
                    className="h-7 text-[11px] text-indigo-200 hover:bg-indigo-800/60"
                    data-testid="intervention-add"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={resetAll}
                    disabled={running}
                    className="h-7 text-[11px] text-indigo-200 hover:bg-indigo-800/60"
                    data-testid="intervention-reset"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  {result && (
                    <Button
                      type="button" size="sm" variant="ghost"
                      onClick={rerun}
                      disabled={running}
                      className="h-7 text-[11px] text-indigo-200 hover:bg-indigo-800/60"
                      data-testid="intervention-rerun"
                      title="Re-run with the same inputs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Re-run
                    </Button>
                  )}
                  <Button
                    type="button" size="sm"
                    onClick={() => runSim()}
                    disabled={!canRun || running}
                    className="h-7 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white"
                    data-testid="intervention-run"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {running ? 'Predicting…' : 'Predict outcome'}
                  </Button>
                </div>
              </div>
            </div>

            {running && !result && <LoadingSkeleton />}

            {error && (
              <div
                className="rounded border border-rose-500/40 bg-rose-900/30 p-2 text-[11px] text-rose-200 flex items-center justify-between gap-2"
                data-testid="movement-sim-error"
              >
                <span>{error}</span>
                <Button
                  type="button" size="sm" variant="ghost"
                  onClick={() => rerun()}
                  className="h-6 text-[10px] text-rose-100 hover:bg-rose-900/60"
                  data-testid="movement-sim-retry"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
              </div>
            )}

            {result && (
              <div className="space-y-2 pt-1 border-t border-indigo-700/40" data-testid="movement-sim-result">
                <VerdictBanner result={result} />
                <ResultSection title="Biomechanical changes" items={result.biomechanicalChanges} testId="bio-changes" />

                {result.slingRebalancing.length > 0 && (
                  <div data-testid="sling-rebalance">
                    <div className="text-[10px] uppercase tracking-wide text-indigo-300/80 mb-1">Sling re-balancing</div>
                    <div className="space-y-1">
                      {result.slingRebalancing.map((s, i) => (
                        <div key={i} className="text-[11px] rounded bg-indigo-900/40 border border-indigo-700/40 px-2 py-1">
                          <span className="font-semibold text-indigo-100">{s.slingId.replace(/_/g, ' ')}</span>
                          <span className={`ml-1.5 ${s.directionPct >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {s.directionPct > 0 ? '+' : ''}{Math.round(s.directionPct)}%
                          </span>
                          {s.note && <div className="text-indigo-200/85 mt-0.5">{s.note}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ResultSection title="Compensation shift" items={result.compensationShift} testId="comp-shift" />

                {result.tissueLoadImpact.length > 0 && (
                  <div data-testid="tissue-impact">
                    <div className="text-[10px] uppercase tracking-wide text-indigo-300/80 mb-1">Tissue load &amp; symptoms</div>
                    <div className="space-y-1">
                      {result.tissueLoadImpact.map((t, i) => {
                        const LIcon = LOAD_ICON[t.loadDirection];
                        return (
                          <div
                            key={i}
                            className="text-[11px] rounded bg-indigo-900/40 border border-indigo-700/40 px-2 py-1"
                            data-testid={`tissue-row-${i}`}
                            data-tissue={t.tissue}
                            data-load={t.loadDirection}
                            data-symptom={t.symptomDirection}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-indigo-100">{t.tissue}</span>
                              <span className={`inline-flex items-center gap-0.5 ${LOAD_TINT[t.loadDirection]}`}>
                                <LIcon className="h-3 w-3" />
                                <span className="text-[10px] uppercase tracking-wide">{t.magnitude}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <span className={`text-[9px] uppercase tracking-wide rounded border px-1 py-0.5 ${SYMPTOM_TINT[t.symptomDirection]}`}>
                                {t.symptomDirection === 'improve' ? 'symptoms ↓' : t.symptomDirection === 'worsen' ? 'symptoms ↑' : 'symptoms ='}
                              </span>
                            </div>
                            {t.mechanism && <div className="text-indigo-200/85 mt-0.5">{t.mechanism}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-indigo-200/85 rounded bg-indigo-900/40 border border-indigo-700/40 px-2 py-1.5">
                  <span className="uppercase tracking-wide text-indigo-300/80">Confidence:</span>{' '}
                  <span className="font-semibold text-indigo-100 capitalize">{result.confidence}</span>
                  {result.confidenceReason && <div className="mt-0.5">{result.confidenceReason}</div>}
                </div>

                {result.caveats.length > 0 && (
                  <ResultSection title="Caveats" items={result.caveats} testId="caveats" />
                )}

                {result.cached && (
                  <div className="text-[9px] text-indigo-300/70 italic text-right">
                    Cached prediction · same inputs as a previous run
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 pt-1 border-t border-indigo-700/40" data-testid="movement-sim-loading">
      <div className="h-7 rounded bg-indigo-900/40 border border-indigo-700/40 animate-pulse" />
      <div className="space-y-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-5 rounded bg-indigo-900/30 border border-indigo-700/30 animate-pulse" />
        ))}
      </div>
      <div className="h-12 rounded bg-indigo-900/40 border border-indigo-700/40 animate-pulse" />
      <div className="space-y-1">
        {[0, 1].map(i => (
          <div key={i} className="h-9 rounded bg-indigo-900/30 border border-indigo-700/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function VerdictBanner({ result }: { result: MovementSimResult }) {
  const v = VERDICT_STYLES[result.netVerdict];
  const Icon = v.Icon;
  return (
    <div className={`rounded border px-2 py-1.5 ${v.bg} ${v.border} ${v.text}`} data-testid="verdict-banner">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{result.netVerdict}</span>
      </div>
      {result.verdictRationale && (
        <div className="text-[11px] mt-0.5 leading-snug">{result.verdictRationale}</div>
      )}
    </div>
  );
}

function ResultSection({ title, items, testId }: { title: string; items: string[]; testId: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div data-testid={testId}>
      <div className="text-[10px] uppercase tracking-wide text-indigo-300/80 mb-1">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[11px] rounded bg-indigo-900/40 border border-indigo-700/40 px-2 py-1 text-indigo-100">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

