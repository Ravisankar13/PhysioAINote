/**
 * Active Movement Mode
 *
 * Lists every joint × movement in the active-capacity profile,
 * grouped by anatomical region with collapse state persisted per
 * (clinician × case). Each row shows source provenance (AI / Manual /
 * Pathology baseline) and is editable: active min/max, painful arc
 * start/end/intensity, strength %, pain-inhibition factor.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Sparkles, Loader2, Pencil, RefreshCw, ChevronDown, ChevronRight,
  Minimize2, Maximize2, Move, PinOff,
} from 'lucide-react';
import { useActiveCapacities, type ActiveCapacityRow } from '@/hooks/useActiveCapacities';
import { useAuth } from '@/hooks/use-auth';

interface Props {
  caseId: string | null;
  className?: string;
}

const JOINT_LABELS: Record<string, string> = {
  leftShoulder: 'L Shoulder',  rightShoulder: 'R Shoulder',
  leftHip: 'L Hip',            rightHip: 'R Hip',
  leftKnee: 'L Knee',          rightKnee: 'R Knee',
  leftAnkle: 'L Ankle',        rightAnkle: 'R Ankle',
  lumbar_spine: 'Lumbar spine',
  cervical_spine: 'Cervical spine',
  thoracic_spine: 'Thoracic spine',
  leftElbow: 'L Elbow', rightElbow: 'R Elbow',
};

const REGION_BY_JOINT: Record<string, string> = {
  leftShoulder: 'Upper limb',  rightShoulder: 'Upper limb',
  leftElbow: 'Upper limb',     rightElbow: 'Upper limb',
  cervical_spine: 'Spine',     thoracic_spine: 'Spine',     lumbar_spine: 'Spine',
  leftHip: 'Lower limb',       rightHip: 'Lower limb',
  leftKnee: 'Lower limb',      rightKnee: 'Lower limb',
  leftAnkle: 'Lower limb',     rightAnkle: 'Lower limb',
};
const REGION_ORDER = ['Spine', 'Upper limb', 'Lower limb'];

function jointLabel(j: string) { return JOINT_LABELS[j] ?? j; }

type Draft = {
  activeRomMin?: number; activeRomMax?: number;
  painfulArcStart?: number; painfulArcEnd?: number; painfulArcIntensity?: number; painfulArcEnabled?: boolean;
  activeStrengthPct?: number; painInhibitionFactor?: number;
};

function usePersistentJSON<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);
  // Reload on key change.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
      else setValue(defaultValue);
    } catch { setValue(defaultValue); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const setAndPersist = useCallback((v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* swallow quota / unavailable */ }
      return next;
    });
  }, [key]);
  return [value, setAndPersist];
}

const PANEL_WIDTH = 340;

export default function ActiveCapacitiesPanel({ caseId, className = '' }: Props) {
  const { user } = useAuth();
  const { profile, effectiveProfile, isLoading, isFetching, generate, override, generating, overriding } = useActiveCapacities(caseId, !!caseId);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});

  const namespace = `activeMovement:${user?.id ?? 'anon'}:panel:${caseId ?? 'none'}`;
  const [collapsedRegions, setCollapsedRegions] = usePersistentJSON<Record<string, boolean>>(`${namespace}:open`, {});
  const [collapsed, setCollapsed] = usePersistentJSON<boolean>(`${namespace}:panelCollapsed`, false);
  const [floating, setFloating] = usePersistentJSON<{ x: number; y: number } | null>(`${namespace}:panelFloat`, null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const toggleRegion = (region: string) => {
    setCollapsedRegions(prev => ({ ...prev, [region]: !prev[region] }));
  };

  // Group ALL rows by region (no "interesting" filter).
  const groupedRows = useMemo(() => {
    const groups: Record<string, ActiveCapacityRow[]> = {};
    for (const r of effectiveProfile.rows) {
      const region = REGION_BY_JOINT[r.joint] ?? 'Other';
      if (!groups[region]) groups[region] = [];
      groups[region].push(r);
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => (a.joint + a.movement).localeCompare(b.joint + b.movement));
    }
    return groups;
  }, [effectiveProfile]);

  // Clamp floating position to viewport on window resize.
  useEffect(() => {
    if (!floating) return;
    const onResize = () => {
      setFloating(prev => {
        if (!prev) return prev;
        const w = cardRef.current?.offsetWidth ?? PANEL_WIDTH;
        const h = cardRef.current?.offsetHeight ?? 100;
        const maxX = Math.max(8, window.innerWidth - w - 8);
        const maxY = Math.max(8, window.innerHeight - h - 8);
        return {
          x: Math.min(Math.max(8, prev.x), maxX),
          y: Math.min(Math.max(8, prev.y), maxY),
        };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [floating, setFloating]);

  // Drag handling.
  const dragStateRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (!floating) return;
    // Don't start drag from button clicks.
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    e.preventDefault();
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: floating.x,
      baseY: floating.y,
    };
    const onMove = (ev: MouseEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      const w = cardRef.current?.offsetWidth ?? PANEL_WIDTH;
      const h = cardRef.current?.offsetHeight ?? 100;
      const maxX = Math.max(8, window.innerWidth - w - 8);
      const maxY = Math.max(8, window.innerHeight - h - 8);
      const nx = Math.min(Math.max(8, s.baseX + (ev.clientX - s.startX)), maxX);
      const ny = Math.min(Math.max(8, s.baseY + (ev.clientY - s.startY)), maxY);
      setFloating({ x: nx, y: ny });
    };
    const onUp = () => {
      dragStateRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [floating, setFloating]);

  const toggleFloating = useCallback(() => {
    if (floating) {
      setFloating(null);
    } else {
      const rect = wrapperRef.current?.getBoundingClientRect();
      const x = rect ? rect.left : 80;
      const y = rect ? rect.top : 80;
      const w = cardRef.current?.offsetWidth ?? PANEL_WIDTH;
      const h = cardRef.current?.offsetHeight ?? 100;
      const maxX = Math.max(8, window.innerWidth - w - 8);
      const maxY = Math.max(8, window.innerHeight - h - 8);
      setFloating({
        x: Math.min(Math.max(8, x), maxX),
        y: Math.min(Math.max(8, y), maxY),
      });
    }
  }, [floating, setFloating]);

  if (!caseId) {
    return (
      <Card className={`p-4 bg-emerald-950/40 border-emerald-700/50 text-emerald-100 ${className}`}>
        <div className="text-xs">No case loaded — generate a case description to enable Active Movement Mode.</div>
      </Card>
    );
  }

  const stop = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

  const headerControls = (
    <div className="flex items-center gap-1" onMouseDown={stop}>
      {!profile && (
        <Button
          size="sm"
          className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={(e) => { stop(e); generate.mutate(false); }}
          disabled={generating || isLoading}
          data-testid="generate-active-capacities"
        >
          {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
          Generate
        </Button>
      )}
      {profile && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-emerald-200 hover:bg-emerald-800/40"
          onClick={(e) => { stop(e); generate.mutate(true); }}
          disabled={generating}
          data-testid="regenerate-active-capacities"
        >
          {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Re-run
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-emerald-200 hover:bg-emerald-800/40"
        onClick={(e) => { stop(e); setCollapsed(!collapsed); }}
        title={collapsed ? 'Expand panel' : 'Collapse panel'}
        data-testid="toggle-panel-collapsed"
      >
        {collapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-emerald-200 hover:bg-emerald-800/40"
        onClick={(e) => { stop(e); toggleFloating(); }}
        title={floating ? 'Dock panel' : 'Float panel'}
        data-testid="toggle-panel-floating"
      >
        {floating ? <PinOff className="h-3 w-3" /> : <Move className="h-3 w-3" />}
      </Button>
    </div>
  );

  const cardClass = [
    'bg-emerald-950/40 border-emerald-700/50 text-emerald-50 flex flex-col overflow-hidden',
    collapsed ? '' : 'max-h-[min(70vh,640px)]',
    floating ? 'shadow-2xl w-full' : className,
  ].filter(Boolean).join(' ');

  const card = (
    <Card ref={cardRef} className={cardClass}>
      <div
        className={`flex items-center justify-between p-3 border-b border-emerald-700/40 shrink-0 ${floating ? 'cursor-move select-none' : ''}`}
        onMouseDown={onHeaderMouseDown}
        data-testid="active-capacities-header"
      >
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Active Capacities</div>
          {!collapsed && (
            profile?.rationaleSummary ? (
              <div className="text-[11px] text-emerald-100/80 mt-1 max-w-[480px]">{profile.rationaleSummary}</div>
            ) : (
              <div className="text-[11px] text-emerald-100/60 italic mt-1">
                {profile ? '' : (isLoading || isFetching || generating
                  ? 'Loading case profile — showing default passive×0.85 baseline.'
                  : 'No AI profile yet — showing default passive×0.85 baseline.')}
              </div>
            )
          )}
        </div>
        {headerControls}
      </div>
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        data-testid="active-capacities-scroll"
        style={collapsed ? { display: 'none' } : undefined}
      >
        <div className="p-3 space-y-2">
          {REGION_ORDER.concat(Object.keys(groupedRows).filter(k => !REGION_ORDER.includes(k))).map(region => {
            const rows = groupedRows[region];
            if (!rows || rows.length === 0) return null;
            const regionCollapsed = !!collapsedRegions[region];
            return (
              <div key={region} className="rounded border border-emerald-800/50 bg-emerald-900/20" data-testid={`capacity-region-${region}`}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] text-emerald-100 hover:bg-emerald-900/40"
                  onClick={() => toggleRegion(region)}
                  data-testid={`toggle-region-${region}`}
                >
                  <span className="flex items-center gap-1 font-semibold">
                    {regionCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {region}
                  </span>
                  <span className="text-emerald-300/70">{rows.length}</span>
                </button>
                {!regionCollapsed && (
                  <div className="p-1.5 space-y-1">
                    {rows.map(row => {
                      const key = `${row.joint}:${row.movement}`;
                      const isEditing = editing === key;
                      const sourceBadge = row.source === 'ai'
                        ? { label: 'AI',     cls: 'bg-emerald-500/30 text-emerald-100 border-emerald-400/40' }
                        : row.source === 'manual'
                        ? { label: 'Manual', cls: 'bg-blue-500/30 text-blue-100 border-blue-400/40' }
                        : { label: 'Default', cls: 'bg-slate-500/30 text-slate-100 border-slate-400/40' };
                      return (
                        <div key={key} className="rounded border border-emerald-800/50 bg-emerald-900/40 px-2 py-1.5 text-[11px]" data-testid={`capacity-row-${key}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate flex items-center gap-1.5">
                                <span>{jointLabel(row.joint)} · {row.movement}</span>
                                <span className={`text-[9px] uppercase tracking-wide rounded border px-1 py-0.5 ${sourceBadge.cls}`} data-testid={`badge-${key}`}>{sourceBadge.label}</span>
                              </div>
                              <div className="text-emerald-200/80 mt-0.5">
                                Active {Math.round(row.activeRomMin)}–{Math.round(row.activeRomMax)}° / Passive {Math.round(row.passiveRomMin)}–{Math.round(row.passiveRomMax)}°
                                {row.painfulArc && (
                                  <span className="ml-1 text-rose-300">· Painful arc {Math.round(row.painfulArc.start)}–{Math.round(row.painfulArc.end)}° ({row.painfulArc.intensity}/10)</span>
                                )}
                                {row.activeStrengthPct < 100 && (
                                  <span className="ml-1 text-amber-300">· Strength {Math.round(row.activeStrengthPct)}%</span>
                                )}
                                {row.painInhibitionFactor > 0 && (
                                  <span className="ml-1 text-yellow-300">· Inhibition {Math.round(row.painInhibitionFactor * 100)}%</span>
                                )}
                              </div>
                              {row.rationale && !isEditing && (
                                <div className="text-emerald-200/60 italic mt-0.5">{row.rationale}</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-emerald-200 hover:bg-emerald-800/40"
                              onClick={() => {
                                if (isEditing) { setEditing(null); setDraft({}); }
                                else {
                                  setEditing(key);
                                  setDraft({
                                    activeRomMin: row.activeRomMin,
                                    activeRomMax: row.activeRomMax,
                                    activeStrengthPct: row.activeStrengthPct,
                                    painInhibitionFactor: row.painInhibitionFactor,
                                    painfulArcEnabled: !!row.painfulArc,
                                    painfulArcStart: row.painfulArc?.start,
                                    painfulArcEnd: row.painfulArc?.end,
                                    painfulArcIntensity: row.painfulArc?.intensity,
                                  });
                                }
                              }}
                              data-testid={`edit-capacity-${key}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          {isEditing && (
                            <div className="mt-2 pt-2 border-t border-emerald-800/50 grid grid-cols-2 gap-2">
                              <label className="text-[10px] text-emerald-200">
                                Active min°
                                <Input type="number"
                                  value={draft.activeRomMin ?? row.activeRomMin}
                                  onChange={(e) => setDraft({ ...draft, activeRomMin: Number(e.target.value) })}
                                  className="h-7 mt-0.5 bg-emerald-900/60 border-emerald-700 text-emerald-50" />
                              </label>
                              <label className="text-[10px] text-emerald-200">
                                Active max°
                                <Input type="number"
                                  value={draft.activeRomMax ?? row.activeRomMax}
                                  onChange={(e) => setDraft({ ...draft, activeRomMax: Number(e.target.value) })}
                                  className="h-7 mt-0.5 bg-emerald-900/60 border-emerald-700 text-emerald-50" />
                              </label>
                              <label className="text-[10px] text-emerald-200">
                                Strength %
                                <Input type="number" min={0} max={100}
                                  value={draft.activeStrengthPct ?? row.activeStrengthPct}
                                  onChange={(e) => setDraft({ ...draft, activeStrengthPct: Number(e.target.value) })}
                                  className="h-7 mt-0.5 bg-emerald-900/60 border-emerald-700 text-emerald-50" />
                              </label>
                              <label className="text-[10px] text-emerald-200">
                                Pain inhibition (0-1)
                                <Input type="number" step={0.1} min={0} max={1}
                                  value={draft.painInhibitionFactor ?? row.painInhibitionFactor}
                                  onChange={(e) => setDraft({ ...draft, painInhibitionFactor: Number(e.target.value) })}
                                  className="h-7 mt-0.5 bg-emerald-900/60 border-emerald-700 text-emerald-50" />
                              </label>
                              <label className="col-span-2 text-[10px] text-emerald-200 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={draft.painfulArcEnabled ?? false}
                                  onChange={(e) => setDraft({ ...draft, painfulArcEnabled: e.target.checked })}
                                  data-testid={`painful-arc-toggle-${key}`}
                                />
                                Painful arc
                              </label>
                              {draft.painfulArcEnabled && (
                                <>
                                  <label className="text-[10px] text-rose-200">
                                    Arc start°
                                    <Input type="number"
                                      value={draft.painfulArcStart ?? 0}
                                      onChange={(e) => setDraft({ ...draft, painfulArcStart: Number(e.target.value) })}
                                      className="h-7 mt-0.5 bg-rose-950/40 border-rose-700 text-rose-50" />
                                  </label>
                                  <label className="text-[10px] text-rose-200">
                                    Arc end°
                                    <Input type="number"
                                      value={draft.painfulArcEnd ?? 0}
                                      onChange={(e) => setDraft({ ...draft, painfulArcEnd: Number(e.target.value) })}
                                      className="h-7 mt-0.5 bg-rose-950/40 border-rose-700 text-rose-50" />
                                  </label>
                                  <label className="col-span-2 text-[10px] text-rose-200">
                                    Arc intensity (1-10)
                                    <Input type="number" min={1} max={10}
                                      value={draft.painfulArcIntensity ?? 5}
                                      onChange={(e) => setDraft({ ...draft, painfulArcIntensity: Number(e.target.value) })}
                                      className="h-7 mt-0.5 bg-rose-950/40 border-rose-700 text-rose-50" />
                                  </label>
                                </>
                              )}
                              <div className="col-span-2 flex justify-end gap-2 mt-1">
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-200 hover:bg-emerald-800/40"
                                  onClick={() => { setEditing(null); setDraft({}); }}>Cancel</Button>
                                <Button size="sm" className="h-6 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white"
                                  disabled={overriding}
                                  onClick={() => {
                                    const painfulArc = draft.painfulArcEnabled
                                      ? {
                                          start: draft.painfulArcStart ?? 0,
                                          end: draft.painfulArcEnd ?? 0,
                                          intensity: Math.max(1, Math.min(10, draft.painfulArcIntensity ?? 5)),
                                        }
                                      : null;
                                    override.mutate({
                                      joint: row.joint,
                                      movement: row.movement,
                                      activeRomMin: draft.activeRomMin,
                                      activeRomMax: draft.activeRomMax,
                                      activeStrengthPct: draft.activeStrengthPct,
                                      painInhibitionFactor: draft.painInhibitionFactor,
                                      painfulArc,
                                    });
                                    setEditing(null); setDraft({});
                                  }}
                                  data-testid={`save-capacity-${key}`}
                                >Save</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );

  if (floating) {
    return (
      <div
        ref={wrapperRef}
        style={{ position: 'fixed', left: floating.x, top: floating.y, zIndex: 50, width: PANEL_WIDTH }}
        data-testid="active-capacities-floating-wrapper"
      >
        {card}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={className}>
      {card}
    </div>
  );
}
