/**
 * Task #376 — Three-Layer Response Panel.
 *
 * Lower-right collapsible panel with three stacked sub-panels:
 *   - Mechanical: bone translation mm + axis, capsular strain tri-bar,
 *     compression/distraction needle.
 *   - Neuromuscular: per-muscle activation deltas, pain meter (0–10),
 *     autonomic needle, withdrawal flag, pain-spasm-pain flag.
 *   - Clinical: live ROM delta per direction, pain delta, capsular
 *     extensibility delta, treatment-effectiveness score, summary.
 *
 * Subscribed to live engine output via props; renders only in
 * Treatment Mode.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Activity } from 'lucide-react';
import type { MechanicalResponse } from '@/lib/treatmentMechanicalEngine';
import type { NeuromuscularResponse } from '@/lib/treatmentNeuromuscularEngine';
import type { ClinicalOutcome } from '@/lib/treatmentClinicalEngine';

export interface TreatmentResponsePanelProps {
  mechanical: MechanicalResponse | null;
  neuromuscular: NeuromuscularResponse | null;
  clinical: ClinicalOutcome | null;
  irritability: number;
}

export default function TreatmentResponsePanel(props: TreatmentResponsePanelProps) {
  const { mechanical, neuromuscular, clinical, irritability } = props;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="absolute bottom-20 right-3 z-30 w-[300px] rounded-xl shadow-2xl bg-slate-900/95 backdrop-blur border border-amber-500/40 text-slate-100 pointer-events-auto"
      data-testid="treatment-response-panel"
    >
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border-b border-amber-500/30 bg-amber-500/10 rounded-t-xl"
      >
        <div className="flex items-center gap-1.5 text-amber-200">
          <Activity className="h-3 w-3" />
          <span className="text-xs uppercase tracking-wider font-semibold">Live Response</span>
        </div>
        {collapsed ? <ChevronUp className="h-3 w-3 text-amber-200" /> : <ChevronDown className="h-3 w-3 text-amber-200" />}
      </button>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* Mechanical */}
          <Section title="Mechanical">
            {mechanical ? (
              <div className="space-y-1.5">
                <Row label="Translation"
                  value={`${mechanical.translationMm.magnitude.toFixed(2)} mm${mechanical.saturated ? ' · capped' : ''}`}
                  testId="tx-resp-translation" />
                <Row label="Off-axis"
                  value={`${mechanical.lineOfDriveErrorDeg.toFixed(0)}°`}
                  warn={mechanical.lineOfDriveErrorDeg > 15} />
                <Row label="Compression"
                  value={mechanical.compressionScalar > 0
                    ? `+${mechanical.compressionScalar.toFixed(2)}`
                    : `${mechanical.compressionScalar.toFixed(2)} (distraction)`} />
                <CapsuleStrainBars strain={mechanical.capsularStrain} />
                {mechanical.adjacentForce && (
                  <Row label={`→ ${mechanical.adjacentForce.bone}`}
                    value={`${(mechanical.adjacentForce.magnitude * 100).toFixed(0)}% sympathy`} />
                )}
              </div>
            ) : <Empty />}
          </Section>

          {/* Neuromuscular */}
          <Section title="Neuromuscular">
            {neuromuscular ? (
              <div className="space-y-1.5">
                <PainMeter delta={neuromuscular.painDelta} irritability={irritability} />
                <Row label="Guarding" value={`${(neuromuscular.guardingScalar * 100).toFixed(0)}%`}
                  warn={neuromuscular.guardingScalar > 0.6} />
                <AutonomicNeedle tone={neuromuscular.autonomicTone} />
                {neuromuscular.withdrawalFlag && (
                  <div className="flex items-center gap-1 text-[10px] text-red-300">
                    <AlertTriangle className="h-3 w-3" /> Withdrawal reflex triggered
                  </div>
                )}
                {neuromuscular.painSpasmPainEngaged && (
                  <div className="flex items-center gap-1 text-[10px] text-red-300">
                    <AlertTriangle className="h-3 w-3" /> Pain–spasm–pain engaged
                  </div>
                )}
                <details className="text-[10px] text-slate-400">
                  <summary className="cursor-pointer">Muscle activation</summary>
                  <ul className="mt-1 space-y-0.5">
                    {neuromuscular.muscleActivationDelta.map(m => (
                      <li key={m.muscle} className="flex justify-between">
                        <span className="truncate pr-1">{m.muscle}</span>
                        <span className={m.delta > 0 ? 'text-red-300' : 'text-emerald-300'}>
                          {m.delta > 0 ? '+' : ''}{(m.delta * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ) : <Empty />}
          </Section>

          {/* Clinical */}
          <Section title="Clinical">
            {clinical ? (
              <div className="space-y-1.5">
                {Object.entries(clinical.romDelta).map(([k, v]) => (
                  <Row key={k} label={`ROM ${k.split('.').pop()}`}
                    value={`${v >= 0 ? '+' : ''}${v.toFixed(1)}°`} testId={`tx-resp-rom-${k}`} />
                ))}
                <Row label="Pain Δ"
                  value={`${clinical.painDelta >= 0 ? '+' : ''}${clinical.painDelta.toFixed(1)}/10`}
                  warn={clinical.painDelta > 1} good={clinical.painDelta < 0} />
                {Object.entries(clinical.capsularExtensibilityDelta).map(([k, v]) => (
                  <Row key={k} label={`Ext ${k.split(':').pop()}`}
                    value={`+${(v * 100).toFixed(1)}%`} good={v > 0.005} />
                ))}
                <Row label="Effectiveness" value={`${clinical.treatmentEffectivenessScore}/100`}
                  good={clinical.treatmentEffectivenessScore >= 70}
                  warn={clinical.treatmentEffectivenessScore < 40} />
                <div className="text-[10px] text-amber-100 italic" data-testid="tx-resp-summary">
                  {clinical.clinicalSummary}
                </div>
              </div>
            ) : <Empty />}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, warn, good, testId }: { label: string; value: string; warn?: boolean; good?: boolean; testId?: string }) {
  const tint = warn ? 'text-red-300' : good ? 'text-emerald-300' : 'text-slate-100';
  return (
    <div className="flex items-center justify-between text-[11px]" data-testid={testId}>
      <span className="text-slate-400">{label}</span>
      <span className={`tabular-nums ${tint}`}>{value}</span>
    </div>
  );
}

function CapsuleStrainBars({ strain }: { strain: MechanicalResponse['capsularStrain'] }) {
  return (
    <div className="space-y-0.5">
      {(['anterior', 'posterior', 'inferior', 'superior'] as const).map(r => {
        const s = strain[r];
        const tint = s.overstretched ? 'bg-red-500' : s.value > 0.7 ? 'bg-amber-400' : s.value > 0.2 ? 'bg-emerald-400' : 'bg-slate-600';
        return (
          <div key={r} className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400 w-14 capitalize">{r}</span>
            <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
              <div className={`h-full ${tint}`} style={{ width: `${Math.min(100, s.value * 100)}%` }} />
            </div>
            <span className="text-[9px] text-slate-300 tabular-nums w-7 text-right">{(s.value * 100).toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function PainMeter({ delta, irritability }: { delta: number; irritability: number }) {
  // Live patient pain ≈ irritability × 8 + delta, clamped 0–10.
  const live = Math.max(0, Math.min(10, irritability * 8 + delta));
  const tint = live > 7 ? 'bg-red-500' : live > 4 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Pain</span><span className="text-slate-100 tabular-nums">{live.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full ${tint}`} style={{ width: `${(live / 10) * 100}%` }} />
      </div>
    </div>
  );
}

function AutonomicNeedle({ tone }: { tone: number }) {
  const pct = ((tone + 1) / 2) * 100;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px] text-slate-400">
        <span>parasympathetic</span><span>sympathetic</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-emerald-500/40 via-slate-700 to-red-500/40 overflow-hidden">
        <div className="absolute top-0 bottom-0 w-1 bg-amber-300" style={{ left: `calc(${pct}% - 2px)` }} />
      </div>
    </div>
  );
}

function Empty() {
  return <div className="text-[10px] text-slate-500 italic">Set a technique to see live readout.</div>;
}
