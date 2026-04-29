/**
 * Task #301 — Active Movement Mode
 *
 * Lightweight panel that lists every joint × direction the AI returned
 * a capacity for, with editable active min/max, painful arc, strength %,
 * and pain-inhibition factor. Edits flow through useActiveCapacities's
 * `override` mutation and persist back onto the same case row.
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { useActiveCapacities, type ActiveCapacityRow } from '@/hooks/useActiveCapacities';

interface Props {
  caseId: string | null;
  className?: string;
}

const JOINT_LABELS: Record<string, string> = {
  leftShoulder: 'L Shoulder',
  rightShoulder: 'R Shoulder',
  leftHip: 'L Hip',
  rightHip: 'R Hip',
  leftKnee: 'L Knee',
  rightKnee: 'R Knee',
  leftAnkle: 'L Ankle',
  rightAnkle: 'R Ankle',
  lumbar_spine: 'Lumbar spine',
  cervical_spine: 'Cervical spine',
  thoracic_spine: 'Thoracic spine',
  leftElbow: 'L Elbow',
  rightElbow: 'R Elbow',
};

function jointLabel(j: string) {
  return JOINT_LABELS[j] ?? j;
}

export default function ActiveCapacitiesPanel({ caseId, className = '' }: Props) {
  const { profile, isLoading, generate, override, generating, overriding } = useActiveCapacities(caseId, !!caseId);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ activeRomMin?: number; activeRomMax?: number; activeStrengthPct?: number; painInhibitionFactor?: number }>({});

  // Show only rows that differ from baseline (pathology-baseline default
  // is 100% strength / 0 inhibition / no painful arc). Keeps the table
  // focused on what the AI thinks is clinically relevant.
  const interestingRows = useMemo(() => {
    if (!profile) return [] as ActiveCapacityRow[];
    return profile.rows.filter(r =>
      r.source !== 'pathology-baseline' ||
      r.painfulArc !== null ||
      r.activeStrengthPct < 100 ||
      r.painInhibitionFactor > 0 ||
      r.activeRomMax < r.passiveRomMax * 0.85
    );
  }, [profile]);

  if (!caseId) {
    return (
      <Card className={`p-4 bg-emerald-950/40 border-emerald-700/50 text-emerald-100 ${className}`}>
        <div className="text-xs">No case loaded — generate a case description to enable Active Movement Mode.</div>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={`p-4 bg-emerald-950/40 border-emerald-700/50 text-emerald-100 ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs">
            <div className="font-semibold mb-1">Active Capacities</div>
            <div className="text-emerald-200/80">No capacity profile generated yet for this case.</div>
          </div>
          <Button
            size="sm"
            className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => generate.mutate(false)}
            disabled={generating || isLoading}
            data-testid="generate-active-capacities"
          >
            {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Generate
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`bg-emerald-950/40 border-emerald-700/50 text-emerald-50 ${className}`}>
      <div className="flex items-center justify-between p-3 border-b border-emerald-700/40">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Active Capacities</div>
          {profile.rationaleSummary && (
            <div className="text-[11px] text-emerald-100/80 mt-1 max-w-[480px]">{profile.rationaleSummary}</div>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-emerald-200 hover:bg-emerald-800/40"
          onClick={() => generate.mutate(true)}
          disabled={generating}
          data-testid="regenerate-active-capacities"
        >
          {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Re-run
        </Button>
      </div>
      <ScrollArea className="max-h-[280px]">
        <div className="p-3 space-y-1">
          {interestingRows.length === 0 && (
            <div className="text-[11px] text-emerald-100/70 italic">No clinically relevant restrictions — patient moves at near-normal active capacity.</div>
          )}
          {interestingRows.map(row => {
            const key = `${row.joint}:${row.movement}`;
            const isEditing = editing === key;
            return (
              <div key={key} className="rounded border border-emerald-800/50 bg-emerald-900/40 px-2 py-1.5 text-[11px]" data-testid={`capacity-row-${key}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{jointLabel(row.joint)} · {row.movement}</div>
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
                      if (isEditing) {
                        setEditing(null);
                        setDraft({});
                      } else {
                        setEditing(key);
                        setDraft({
                          activeRomMin: row.activeRomMin,
                          activeRomMax: row.activeRomMax,
                          activeStrengthPct: row.activeStrengthPct,
                          painInhibitionFactor: row.painInhibitionFactor,
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
                      <Input
                        type="number"
                        value={draft.activeRomMin ?? row.activeRomMin}
                        onChange={(e) => setDraft({ ...draft, activeRomMin: Number(e.target.value) })}
                        className="h-7 mt-0.5 bg-emerald-900/60 border-emerald-700 text-emerald-50"
                      />
                    </label>
                    <label className="text-[10px] text-emerald-200">
                      Active max°
                      <Input
                        type="number"
                        value={draft.activeRomMax ?? row.activeRomMax}
                        onChange={(e) => setDraft({ ...draft, activeRomMax: Number(e.target.value) })}
                        className="h-7 mt-0.5 bg-emerald-900/60 border-emerald-700 text-emerald-50"
                      />
                    </label>
                    <label className="text-[10px] text-emerald-200">
                      Strength %
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={draft.activeStrengthPct ?? row.activeStrengthPct}
                        onChange={(e) => setDraft({ ...draft, activeStrengthPct: Number(e.target.value) })}
                        className="h-7 mt-0.5 bg-emerald-900/60 border-emerald-700 text-emerald-50"
                      />
                    </label>
                    <label className="text-[10px] text-emerald-200">
                      Pain inhibition (0-1)
                      <Input
                        type="number"
                        step={0.1}
                        min={0}
                        max={1}
                        value={draft.painInhibitionFactor ?? row.painInhibitionFactor}
                        onChange={(e) => setDraft({ ...draft, painInhibitionFactor: Number(e.target.value) })}
                        className="h-7 mt-0.5 bg-emerald-900/60 border-emerald-700 text-emerald-50"
                      />
                    </label>
                    <div className="col-span-2 flex justify-end gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-emerald-200 hover:bg-emerald-800/40"
                        onClick={() => { setEditing(null); setDraft({}); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-6 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white"
                        disabled={overriding}
                        onClick={() => {
                          override.mutate({ joint: row.joint, movement: row.movement, ...draft });
                          setEditing(null);
                          setDraft({});
                        }}
                        data-testid={`save-capacity-${key}`}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
