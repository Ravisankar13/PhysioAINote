import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Flame,
  Moon,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RecoveryWeeklyCheckIn } from "@shared/schema";
import type { RecoveryWeeklyCheckIn as EngineCheckIn } from "@/lib/recoverySimulationEngine";

export type WeeklyCheckInRecord = RecoveryWeeklyCheckIn;

/** Tracking verdict — derived from the gap between actual logged
 *  pain at the most recent check-in week and the originally-predicted
 *  pain at the same week. */
export type TrackingStatus = 'ahead' | 'on' | 'behind';

interface Props {
  caseId: string;
  totalWeeks: number;
  /** Original (no-checkins) projected pain at every week, used to
   *  compute the ahead / on / behind verdict. */
  originalPainSeries: number[];
  /** Currently scrubbed week — used as the default for the new
   *  check-in form so a clinician can scrub to a week and log it. */
  defaultWeek: number;
  /** Maximum prescribed sessions per week — pulled from the active
   *  branch's interventions so the form's prescribed-default reflects
   *  the live plan instead of a hard-coded number. */
  defaultPrescribed: number;
}

/** Convert DB row → engine input. The engine type is intentionally
 *  narrower (no id / case / created-at noise) so simulator code stays
 *  free of persistence concerns. */
export function toEngineCheckIns(rows: WeeklyCheckInRecord[]): EngineCheckIn[] {
  return rows.map(r => ({
    week: r.week,
    pain: r.pain,
    flareSeverity: r.flareSeverity ?? null,
    sessionsCompleted: r.sessionsCompleted,
    sessionsPrescribed: r.sessionsPrescribed,
    sleepHours: r.sleepHours != null ? Number(r.sleepHours) : null,
    notes: r.notes ?? null,
  }));
}

/** Pure tracking-indicator derivation. Exported so the parent
 *  dashboard can render the same verdict in its own header without
 *  mounting the panel. Threshold ±5 (engine pain is 0–100) ≈ ±0.5 on
 *  the 0–10 clinical scale, which matches the smallest clinically-
 *  meaningful pain change reported in MCID literature. */
export function deriveTracking(
  checkIns: WeeklyCheckInRecord[],
  originalPainSeries: number[],
): { status: TrackingStatus; lastWeek: number; gap: number } | null {
  if (checkIns.length === 0 || originalPainSeries.length === 0) return null;
  const latest = [...checkIns].sort((a, b) => b.week - a.week)[0];
  const idx = Math.min(latest.week, originalPainSeries.length - 1);
  const expected = originalPainSeries[idx];
  const actual = latest.pain;
  // Pain is "lower is better" — actual below expected = recovering
  // faster than predicted = AHEAD; actual above expected = BEHIND.
  const gap = actual - expected;
  let status: TrackingStatus = 'on';
  if (gap < -5) status = 'ahead';
  else if (gap > 5) status = 'behind';
  return { status, lastWeek: latest.week, gap };
}

export default function WeeklyCheckInPanel({
  caseId,
  totalWeeks,
  originalPainSeries,
  defaultWeek,
  defaultPrescribed,
}: Props) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [week, setWeek] = useState<number>(Math.max(1, defaultWeek || 1));
  const [pain, setPain] = useState<number>(30);
  const [flareSeverity, setFlareSeverity] = useState<number>(0);
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(defaultPrescribed);
  const [sessionsPrescribed, setSessionsPrescribed] = useState<number>(defaultPrescribed);
  const [sleepHours, setSleepHours] = useState<string>('7');
  const [notes, setNotes] = useState<string>('');

  const queryKey = ['/api/recovery-weekly-check-ins', caseId];
  const { data: checkIns = [], isLoading } = useQuery<WeeklyCheckInRecord[]>({
    queryKey,
    enabled: !!caseId,
  });

  const sortedCheckIns = useMemo(
    () => [...checkIns].sort((a, b) => a.week - b.week),
    [checkIns],
  );

  const tracking = useMemo(
    () => deriveTracking(checkIns, originalPainSeries),
    [checkIns, originalPainSeries],
  );

  const upsertMutation = useMutation({
    mutationFn: async (payload: {
      caseId: string;
      week: number;
      pain: number;
      flareSeverity: number | null;
      sessionsCompleted: number;
      sessionsPrescribed: number;
      sleepHours: number | null;
      notes: string | null;
    }) => {
      const res = await apiRequest('POST', '/api/recovery-weekly-check-ins', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Check-in saved', description: `Week ${week} logged.` });
      setShowForm(false);
    },
    onError: (e: Error) => {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (w: number) => {
      const res = await apiRequest('DELETE', `/api/recovery-weekly-check-ins/${encodeURIComponent(caseId)}/${w}`);
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!caseId) {
      toast({ title: 'Cannot save', description: 'Case identity not set.', variant: 'destructive' });
      return;
    }
    const sleepNum = sleepHours.trim() === '' ? null : Number(sleepHours);
    upsertMutation.mutate({
      caseId,
      week,
      pain,
      flareSeverity: flareSeverity > 0 ? flareSeverity : null,
      sessionsCompleted,
      sessionsPrescribed: sessionsPrescribed || defaultPrescribed || 1,
      sleepHours: sleepNum != null && !Number.isNaN(sleepNum) ? sleepNum : null,
      notes: notes.trim() || null,
    });
  };

  const trackChip = tracking ? (
    tracking.status === 'ahead' ? (
      <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500/40 text-[10px] gap-1">
        <TrendingDown className="h-2.5 w-2.5" />Ahead of plan ({tracking.gap.toFixed(0)})
      </Badge>
    ) : tracking.status === 'behind' ? (
      <Badge className="bg-red-600/30 text-red-200 border-red-500/40 text-[10px] gap-1">
        <TrendingUp className="h-2.5 w-2.5" />Behind plan (+{tracking.gap.toFixed(0)})
      </Badge>
    ) : (
      <Badge className="bg-sky-600/30 text-sky-200 border-sky-500/40 text-[10px] gap-1">
        <Minus className="h-2.5 w-2.5" />On track
      </Badge>
    )
  ) : null;

  return (
    <div
      className="bg-gray-900/60 border border-gray-800/80 rounded-lg p-3"
      data-testid="weekly-check-in-panel"
    >
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-300 font-semibold">
          <ClipboardList className="h-3.5 w-3.5 text-violet-300" />Weekly Check-Ins
        </div>
        <div className="flex items-center gap-1.5">
          {trackChip}
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] border-violet-600/50 bg-violet-950/40 text-violet-200 hover:bg-violet-900/60"
            onClick={() => {
              setShowForm(v => !v);
              setWeek(Math.max(1, defaultWeek || 1));
              setSessionsPrescribed(defaultPrescribed || 1);
              setSessionsCompleted(defaultPrescribed || 1);
            }}
            data-testid="weekly-check-in-toggle-form"
          >
            <Plus className="h-3 w-3 mr-1" />Log week
          </Button>
        </div>
      </div>

      {!caseId && (
        <div className="text-[10px] text-amber-300/90 mb-2">
          Case identity not yet established — enter patient name &amp; condition to enable persistence.
        </div>
      )}

      {showForm && caseId && (
        <div
          className="rounded border border-violet-700/40 bg-violet-950/20 p-2 mb-3 space-y-2"
          data-testid="weekly-check-in-form"
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-gray-300 space-y-0.5">
              <span>Week</span>
              <Input
                type="number"
                min={1}
                max={Math.max(1, totalWeeks)}
                value={week}
                onChange={e => setWeek(Math.max(1, Math.min(totalWeeks, Number(e.target.value) || 1)))}
                className="h-7 text-[11px] bg-gray-950/60 border-gray-700/60"
                data-testid="check-in-input-week"
              />
            </label>
            <label className="text-[10px] text-gray-300 space-y-0.5">
              <span>Sleep (hours)</span>
              <Input
                type="number"
                step="0.5"
                min={0}
                max={14}
                value={sleepHours}
                onChange={e => setSleepHours(e.target.value)}
                className="h-7 text-[11px] bg-gray-950/60 border-gray-700/60"
                data-testid="check-in-input-sleep"
              />
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-gray-300">
              <span>Pain (0–100)</span>
              <span className="font-mono text-red-300">{pain}</span>
            </div>
            <Slider
              value={[pain]}
              onValueChange={([v]) => setPain(v)}
              min={0}
              max={100}
              step={1}
              data-testid="check-in-slider-pain"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-gray-300">
              <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" />Flare severity (0 = none)</span>
              <span className="font-mono text-orange-300">{flareSeverity}</span>
            </div>
            <Slider
              value={[flareSeverity]}
              onValueChange={([v]) => setFlareSeverity(v)}
              min={0}
              max={50}
              step={1}
              data-testid="check-in-slider-flare"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-gray-300 space-y-0.5">
              <span>Sessions completed</span>
              <Input
                type="number"
                min={0}
                value={sessionsCompleted}
                onChange={e => setSessionsCompleted(Math.max(0, Number(e.target.value) || 0))}
                className="h-7 text-[11px] bg-gray-950/60 border-gray-700/60"
                data-testid="check-in-input-completed"
              />
            </label>
            <label className="text-[10px] text-gray-300 space-y-0.5">
              <span>Sessions prescribed</span>
              <Input
                type="number"
                min={1}
                value={sessionsPrescribed}
                onChange={e => setSessionsPrescribed(Math.max(1, Number(e.target.value) || 1))}
                className="h-7 text-[11px] bg-gray-950/60 border-gray-700/60"
                data-testid="check-in-input-prescribed"
              />
            </label>
          </div>

          <label className="text-[10px] text-gray-300 space-y-0.5 block">
            <span>Notes (optional)</span>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything notable from the week…"
              className="text-[11px] bg-gray-950/60 border-gray-700/60 resize-none"
              data-testid="check-in-input-notes"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] text-gray-300"
              onClick={() => setShowForm(false)}
              data-testid="check-in-cancel"
            >Cancel</Button>
            <Button
              size="sm"
              className="h-7 px-3 text-[10px] bg-violet-600 hover:bg-violet-500"
              onClick={handleSubmit}
              disabled={upsertMutation.isPending}
              data-testid="check-in-save"
            >
              {upsertMutation.isPending ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving</>
              ) : (
                <><CheckCircle2 className="h-3 w-3 mr-1" />Save check-in</>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5 max-h-56 overflow-y-auto" data-testid="weekly-check-in-list">
        {isLoading && (
          <div className="text-[10px] text-gray-500 italic flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />Loading check-ins…
          </div>
        )}
        {!isLoading && sortedCheckIns.length === 0 && (
          <div className="text-[10px] text-gray-500 italic">
            No check-ins yet. Log this week's status to bend the live curve through real data.
          </div>
        )}
        {sortedCheckIns.map(c => {
          const adherence = c.sessionsPrescribed > 0
            ? Math.round((c.sessionsCompleted / c.sessionsPrescribed) * 100)
            : 0;
          const sleepN = c.sleepHours != null ? Number(c.sleepHours) : null;
          return (
            <div
              key={`${c.caseId}-${c.week}`}
              className="rounded border border-gray-800/80 bg-gray-950/40 p-2 text-[10px] text-gray-200"
              data-testid={`check-in-row-${c.week}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-violet-700/40 text-violet-200 border-violet-600/40 text-[9px]">Wk {c.week}</Badge>
                  <span className="inline-flex items-center gap-1 text-red-300">
                    <Activity className="h-2.5 w-2.5" />Pain {c.pain}
                  </span>
                  <span className="inline-flex items-center gap-1 text-cyan-300">
                    {adherence}% adherence
                  </span>
                  {sleepN != null && (
                    <span className="inline-flex items-center gap-1 text-sky-300">
                      <Moon className="h-2.5 w-2.5" />{sleepN.toFixed(1)}h
                    </span>
                  )}
                  {c.flareSeverity != null && c.flareSeverity > 0 && (
                    <span className="inline-flex items-center gap-1 text-orange-300">
                      <Flame className="h-2.5 w-2.5" />Flare +{c.flareSeverity}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(c.week)}
                  className="h-5 w-5 rounded hover:bg-red-900/40 flex items-center justify-center text-gray-500 hover:text-red-300"
                  data-testid={`check-in-delete-${c.week}`}
                  title={`Delete week ${c.week} check-in`}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {c.notes && (
                <div className="mt-1 text-[10px] text-gray-400 italic">{c.notes}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
