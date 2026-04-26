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
  // Numeric inputs are stored as raw strings so a half-typed value
  // ("", "1.", etc.) doesn't get silently coerced mid-edit. Submission
  // converts them to numbers (or rejects them with an inline error)
  // exactly once, so the API never receives "" — the failure mode that
  // produced the Postgres 500 in Task #257.
  const [week, setWeek] = useState<string>(String(Math.max(1, defaultWeek || 1)));
  const [pain, setPain] = useState<number>(30);
  const [flareSeverity, setFlareSeverity] = useState<number>(0);
  const [sessionsCompleted, setSessionsCompleted] = useState<string>(String(defaultPrescribed));
  const [sessionsPrescribed, setSessionsPrescribed] = useState<string>(String(defaultPrescribed));
  const [sleepHours, setSleepHours] = useState<string>('7');
  const [notes, setNotes] = useState<string>('');

  // The default queryFn fetches `queryKey[0]` as a URL, so the caseId
  // MUST live in the URL itself (not as a separate cache segment) or
  // the request hits the wrong route. Same shape is reused by the
  // dashboard so invalidation works across both consumers.
  const queryKey = useMemo(
    () => [`/api/recovery-weekly-check-ins/${encodeURIComponent(caseId)}`] as const,
    [caseId],
  );
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

  // apiRequest signature is (url, method, data?) and returns the parsed
  // JSON body directly — there is no Response object to call .json() on.
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
      return await apiRequest('/api/recovery-weekly-check-ins', 'POST', payload);
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
      return await apiRequest(
        `/api/recovery-weekly-check-ins/${encodeURIComponent(caseId)}/${w}`,
        'DELETE',
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    },
  });

  // Parse a required integer field. Returns the integer, or `null` if
  // the value is missing/blank/non-numeric. Used to bail submission
  // with a clear inline toast instead of sending "" to the API.
  const parseRequiredInt = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && Number.isInteger(n) ? n : null;
  };

  const handleSubmit = () => {
    if (!caseId) {
      toast({ title: 'Cannot save', description: 'Case identity not set.', variant: 'destructive' });
      return;
    }

    // Validate every numeric input that the schema treats as required.
    // Without this guard, a clinician who clears any number input then
    // hits Save would previously send "" → Postgres 500 (Task #257).
    const weekNum = parseRequiredInt(week);
    if (weekNum == null || weekNum < 1 || weekNum > Math.max(1, totalWeeks)) {
      toast({ title: 'Invalid week', description: `Week must be a whole number between 1 and ${Math.max(1, totalWeeks)}.`, variant: 'destructive' });
      return;
    }
    const completedNum = parseRequiredInt(sessionsCompleted);
    if (completedNum == null || completedNum < 0) {
      toast({ title: 'Invalid sessions completed', description: 'Sessions completed must be a whole number ≥ 0.', variant: 'destructive' });
      return;
    }
    // Prescribed treats *blank* as "use the live plan default" so a
    // clinician who never touches the field still saves cleanly, but
    // any value the clinician actually typed must parse — silently
    // defaulting on parse failure (e.g. "1.5", "abc") would mask a
    // typo and write the wrong cadence to the recovery curve.
    const prescribedTrimmed = sessionsPrescribed.trim();
    let prescribedNum: number;
    if (prescribedTrimmed === '') {
      prescribedNum = defaultPrescribed > 0 ? defaultPrescribed : 1;
    } else {
      const parsed = parseRequiredInt(sessionsPrescribed);
      if (parsed == null) {
        toast({ title: 'Invalid sessions prescribed', description: 'Sessions prescribed must be a whole number ≥ 1.', variant: 'destructive' });
        return;
      }
      prescribedNum = parsed;
    }
    if (prescribedNum < 1) {
      toast({ title: 'Invalid sessions prescribed', description: 'Sessions prescribed must be a whole number ≥ 1.', variant: 'destructive' });
      return;
    }

    // sleepHours is optional — empty/whitespace coerces to null, never "".
    const sleepTrimmed = sleepHours.trim();
    let sleepNum: number | null = null;
    if (sleepTrimmed !== '') {
      const n = Number(sleepTrimmed);
      if (!Number.isFinite(n) || n < 0 || n > 24) {
        toast({ title: 'Invalid sleep hours', description: 'Sleep must be between 0 and 24 hours, or left blank.', variant: 'destructive' });
        return;
      }
      sleepNum = n;
    }

    upsertMutation.mutate({
      caseId,
      week: weekNum,
      pain,
      flareSeverity: flareSeverity > 0 ? flareSeverity : null,
      sessionsCompleted: completedNum,
      sessionsPrescribed: prescribedNum,
      sleepHours: sleepNum,
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
              const opening = !showForm;
              setShowForm(opening);
              if (opening) {
                // Prefill from the most recent prior check-in so the
                // clinician only edits what changed week-over-week.
                // Falls back to sensible defaults on the first log.
                const prior = sortedCheckIns.length > 0
                  ? sortedCheckIns[sortedCheckIns.length - 1]
                  : null;
                const nextWeek = prior
                  ? Math.min(totalWeeks, prior.week + 1)
                  : Math.max(1, defaultWeek || 1);
                // Always seed numeric inputs with a real numeric string
                // (never "" or "undefined"), so a clinician who hits Save
                // without touching the form still produces a valid payload.
                setWeek(String(nextWeek));
                setPain(prior ? prior.pain : 30);
                setFlareSeverity(0); // Flares should not carry forward
                setSessionsPrescribed(
                  String(prior ? prior.sessionsPrescribed : (defaultPrescribed || 1)),
                );
                setSessionsCompleted(
                  String(prior ? prior.sessionsCompleted : (defaultPrescribed || 1)),
                );
                setSleepHours(
                  prior && prior.sleepHours != null
                    ? String(Number(prior.sleepHours))
                    : '7',
                );
                setNotes(''); // Notes are week-specific
              }
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
                onChange={e => setWeek(e.target.value)}
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
                onChange={e => setSessionsCompleted(e.target.value)}
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
                onChange={e => setSessionsPrescribed(e.target.value)}
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
