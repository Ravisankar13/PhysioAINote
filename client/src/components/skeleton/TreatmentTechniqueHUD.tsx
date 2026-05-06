/**
 * Task #376 — Treatment Technique HUD.
 *
 * Right-rail panel that exposes patient position, contact location,
 * line of drive, grade, amplitude, frequency, duration, hold; renders
 * the auto-generated technique string and the technique-quality
 * scorecard; and exposes a "Perform" button that commits the live
 * engine outputs.
 */
import { useMemo, useState } from 'react';
import { Hand, Play, RotateCcw, X } from 'lucide-react';
import {
  JOINT_ACCESSORY_CATALOG,
  type JointAccessoryEntry,
  type AccessoryDirection,
  listJointKeys,
} from '@/lib/jointAccessoryMotions';
import type { TreatmentTechnique } from '@/lib/treatmentMechanicalEngine';
import type { TechniqueQualityScorecard } from '@/lib/treatmentClinicalEngine';

export type PatientPositionPreset = 'supine' | 'prone' | 'side-lying' | 'sitting' | 'loose-packed';

export interface TreatmentTechniqueHUDProps {
  jointKey: string;
  setJointKey: (key: string) => void;
  technique: TreatmentTechnique;
  setTechnique: (next: TreatmentTechnique) => void;
  positionPreset: PatientPositionPreset;
  setPositionPreset: (p: PatientPositionPreset) => void;
  contactRegionLabel: string;
  techniqueString: string;
  scorecard: TechniqueQualityScorecard;
  onPerform: () => void;
  onResetPatientState: () => void;
  onClose: () => void;
  performing: boolean;
}

const POSITION_PRESETS: PatientPositionPreset[] = ['loose-packed', 'supine', 'prone', 'side-lying', 'sitting'];

function ScoreBar({ score }: { score: number }) {
  const tint = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
      <div className={`h-full ${tint}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
    </div>
  );
}

export default function TreatmentTechniqueHUD(props: TreatmentTechniqueHUDProps) {
  const { jointKey, setJointKey, technique, setTechnique, positionPreset, setPositionPreset,
    contactRegionLabel, techniqueString, scorecard, onPerform, onResetPatientState, onClose, performing } = props;

  const entry: JointAccessoryEntry | undefined = JOINT_ACCESSORY_CATALOG[jointKey];
  const direction = entry?.directions.find(d => d.id === technique.directionId) ?? entry?.directions[0];
  const [showLog, setShowLog] = useState(false);

  const jointOptions = useMemo(() => listJointKeys().map(k => ({ k, label: JOINT_ACCESSORY_CATALOG[k].label })), []);

  if (!entry || !direction) return null;

  const setPartial = (patch: Partial<TreatmentTechnique>) => setTechnique({ ...technique, ...patch });

  return (
    <div
      className="absolute top-3 right-3 z-30 w-[340px] rounded-xl shadow-2xl bg-slate-900/95 backdrop-blur border border-amber-500/40 text-slate-100 select-none pointer-events-auto"
      data-testid="treatment-technique-hud"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-amber-500/30 bg-amber-500/10 rounded-t-xl">
        <div className="flex items-center gap-1.5 text-amber-200">
          <Hand className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wider font-semibold">Treatment Technique</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-700/70 hover:text-slate-100"
          aria-label="Close treatment HUD"
          data-testid="tx-hud-close"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="p-3 space-y-3 max-h-[78vh] overflow-y-auto">
        {/* Targeted joint + direction */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-slate-400">Targeted joint</label>
          <select
            value={jointKey}
            onChange={(e) => setJointKey(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
            data-testid="tx-joint-select"
          >
            {jointOptions.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-slate-400">Direction</label>
          <div className="grid grid-cols-1 gap-1">
            {entry.directions.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => setPartial({ directionId: d.id, liveAxis: d.axis })}
                className={`text-xs px-2 py-1 rounded border ${technique.directionId === d.id
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-100'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/70'}`}
                data-testid={`tx-dir-${d.id}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Patient position */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-slate-400">Patient position</label>
          <div className="flex flex-wrap gap-1">
            {POSITION_PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPositionPreset(p)}
                className={`text-[10px] px-2 py-1 rounded border ${positionPreset === p
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-100'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/70'}`}
                data-testid={`tx-pos-${p}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Contact + line of drive */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-slate-400">Contact</label>
          <div className="text-[11px] text-slate-200 bg-slate-800 rounded px-2 py-1 border border-slate-700">
            {contactRegionLabel || direction.defaultContactRegion}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-slate-400">Line of drive (anatomical axis)</label>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <NumberCell label="X" value={technique.liveAxis.x}
              onChange={(v) => setPartial({ liveAxis: { ...technique.liveAxis, x: v } })} />
            <NumberCell label="Y" value={technique.liveAxis.y}
              onChange={(v) => setPartial({ liveAxis: { ...technique.liveAxis, y: v } })} />
            <NumberCell label="Z" value={technique.liveAxis.z}
              onChange={(v) => setPartial({ liveAxis: { ...technique.liveAxis, z: v } })} />
          </div>
          <button
            type="button"
            onClick={() => setPartial({ liveAxis: direction.axis })}
            className="text-[10px] text-amber-300 hover:text-amber-200 underline-offset-2 hover:underline"
            data-testid="tx-snap-axis"
          >
            Snap to true {direction.label.toLowerCase()} axis
          </button>
        </div>

        {/* Grade */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-slate-400">Grade</label>
          <div className="flex items-center gap-1">
            <div className="flex rounded border border-slate-700 overflow-hidden">
              {(['maitland', 'kaltenborn'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setPartial({ gradeSystem: g, grade: g === 'maitland' ? 3 : 2 })}
                  className={`text-[10px] px-2 py-0.5 ${technique.gradeSystem === g
                    ? 'bg-amber-500/20 text-amber-100'
                    : 'bg-slate-800 text-slate-300'}`}
                  data-testid={`tx-grade-system-${g}`}
                >
                  {g === 'maitland' ? 'Maitland' : 'Kaltenborn'}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-1">
              {(technique.gradeSystem === 'maitland' ? [1, 2, 3, 4, 5] : [1, 2, 3]).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setPartial({ grade: g })}
                  className={`w-6 h-6 text-[10px] rounded border ${technique.grade === g
                    ? 'bg-amber-500/30 border-amber-500/60 text-amber-100'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/70'}`}
                  data-testid={`tx-grade-${g}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Amplitude / freq / duration */}
        <SliderRow label="Amplitude" value={technique.amplitudeMm} min={1} max={20} step={1} unit="mm"
          onChange={(v) => setPartial({ amplitudeMm: v })} testId="tx-amplitude" />
        <SliderRow label="Frequency" value={technique.frequencyHz} min={0.2} max={4} step={0.1} unit="Hz"
          onChange={(v) => setPartial({ frequencyHz: v })} testId="tx-frequency" />
        <SliderRow label="Duration" value={technique.durationSec} min={5} max={180} step={5} unit="s"
          onChange={(v) => setPartial({ durationSec: v })} testId="tx-duration" />
        <SliderRow label="Hold" value={technique.holdSec} min={0} max={30} step={1} unit="s"
          onChange={(v) => setPartial({ holdSec: v })} testId="tx-hold" />

        {/* Technique string */}
        <div className="rounded bg-slate-800/80 border border-slate-700 px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-400">Technique string</div>
          <div className="text-[11px] text-amber-100 font-mono leading-snug" data-testid="tx-string">{techniqueString}</div>
        </div>

        {/* Scorecard */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Quality scorecard</span>
            <span className="text-[11px] font-bold tabular-nums text-amber-200" data-testid="tx-quality-overall">{scorecard.overall}/100</span>
          </div>
          <ScoreRow label="Position" {...scorecard.positionCorrectness} />
          <ScoreRow label="Grade" {...scorecard.gradeAppropriateness} />
          <ScoreRow label="Line of drive" {...scorecard.lineOfDriveAccuracy} />
          <ScoreRow label="Contraindications" {...scorecard.contraindicationCheck} />
          <ScoreRow label="Dose" {...scorecard.doseAdequacy} />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onPerform}
            disabled={performing}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold py-1.5 disabled:opacity-50"
            data-testid="tx-perform"
          >
            <Play className="h-3 w-3" />
            {performing ? 'Performing…' : 'Perform'}
          </button>
          <button
            type="button"
            onClick={onResetPatientState}
            className="inline-flex items-center justify-center rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-1.5"
            data-testid="tx-reset-state"
            title="Revert per-session capsular extensibility / accessory mobility increments"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowLog(s => !s)}
          className="text-[10px] text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
        >
          {showLog ? 'Hide' : 'Show'} session log
        </button>
      </div>
    </div>
  );
}

function NumberCell({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1">
      <span className="text-slate-500">{label}</span>
      <input
        type="number"
        step={0.1}
        min={-1}
        max={1}
        value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent outline-none text-slate-100 tabular-nums"
      />
    </label>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange, testId }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void; testId: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400 uppercase tracking-wide">{label}</span>
        <span className="text-slate-100 font-mono" data-testid={`${testId}-value`}>
          {value.toFixed(unit === 'Hz' ? 1 : 0)} {unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500"
        data-testid={testId}
      />
    </div>
  );
}

function ScoreRow({ label, score, rationale }: { label: string; score: number; rationale: string }) {
  return (
    <div className="space-y-0.5" title={rationale}>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-100 tabular-nums">{score}</span>
      </div>
      <ScoreBar score={score} />
      <div className="text-[9px] text-slate-500 leading-tight">{rationale}</div>
    </div>
  );
}
