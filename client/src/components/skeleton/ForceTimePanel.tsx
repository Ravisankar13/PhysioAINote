import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Activity, Clock, ArrowLeftRight, Zap, Info, Play, Pause } from 'lucide-react';
import { forceTimeBuffer, type ForceTimeMetrics } from '@/lib/forceTimeBuffer';
import {
  THRESHOLD_TABLE,
  CITATIONS,
  patientStateLabel,
  getCategoryEntry,
  type PatientState,
  type Citation,
} from '@/lib/forceCitations';
import { formatNewtons, propagateLinkedSegments } from '@/lib/grfVector';

export interface ForceTimePanelProps {
  patientState: PatientState;
  onPatientStateChange: (state: PatientState) => void;
  onClose: () => void;
  onScrub: (relMs: number | null) => void;
}

const STATES: PatientState[] = ['default', 'post_op', 'osteoporotic', 'pediatric', 'athlete'];

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

function bandColor(band: 'acceptable' | 'watch' | 'flag'): string {
  if (band === 'acceptable') return '#22c55e';
  if (band === 'watch') return '#eab308';
  return '#ef4444';
}

export default function ForceTimePanel({
  patientState,
  onPatientStateChange,
  onClose,
  onScrub,
}: ForceTimePanelProps) {
  const [tick, setTick] = useState(0);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [openCitation, setOpenCitation] = useState<Citation | null>(null);

  // Re-render whenever the buffer changes.
  useEffect(() => {
    return forceTimeBuffer.subscribe(() => setTick(v => v + 1));
  }, []);

  const m: ForceTimeMetrics = useMemo(
    () => forceTimeBuffer.getMetrics(),
    [tick],
  );
  const playbackRel = forceTimeBuffer.getPlaybackTime();

  const topJoints = m.joints.slice(0, 6);
  const totalDoseHigh = m.joints.reduce((acc, j) => acc + j.doseMs.high + j.doseMs.very_high, 0);
  const peakRate = m.joints.reduce((mx, j) => Math.max(mx, j.peakRateNps), 0);
  const peakRateJoint = m.joints.find(j => j.peakRateNps === peakRate);
  const worstAsym = m.asymmetry.reduce<typeof m.asymmetry[number] | null>(
    (mx, a) => (mx == null || a.indexPct > mx.indexPct ? a : mx), null,
  );
  const linkedSegments = useMemo(
    () => propagateLinkedSegments(70, m.impact.inertialN),
    [m.impact.inertialN],
  );

  const handleScrub = (val: number) => {
    setScrubValue(val);
    forceTimeBuffer.setPlaybackTime(val);
    onScrub(val);
  };
  const handleScrubEnd = () => {
    setScrubValue(null);
    forceTimeBuffer.setPlaybackTime(null);
    onScrub(null);
  };

  return (
    <div className="absolute top-20 right-4 z-30 w-[380px] max-h-[78vh] overflow-y-auto bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-700/60 shadow-2xl">
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-white">Force over time</span>
          <span className="text-[10px] text-gray-400 tabular-nums">
            {m.frameCount} frames · {formatMs(m.bufferLengthMs)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
          data-testid="ftp-close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Patient state selector — drives threshold tables */}
      <div className="px-3 py-2 border-b border-gray-700/40">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Patient state</div>
        <div className="flex flex-wrap gap-1">
          {STATES.map(s => (
            <button
              key={s}
              onClick={() => onPatientStateChange(s)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                patientState === s
                  ? 'bg-amber-500/25 border-amber-500/60 text-amber-200'
                  : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-700/80'
              }`}
              data-testid={`ftp-state-${s}`}
            >
              {patientStateLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-gray-700/40">
        <Headline
          icon={<Activity className="h-3 w-3 text-amber-400" />}
          label="Peak rate of loading"
          value={peakRate > 0 ? `${Math.round(peakRate)} N/s` : '—'}
          sub={peakRateJoint ? `${peakRateJoint.label.split('(')[0].trim()}` : ''}
        />
        <Headline
          icon={<Clock className="h-3 w-3 text-rose-400" />}
          label="Time above high band"
          value={formatMs(totalDoseHigh)}
          sub={totalDoseHigh > 0 ? 'cumulative across joints' : 'session within bands'}
        />
        <Headline
          icon={<Zap className="h-3 w-3 text-orange-400" />}
          label="Impact (inertial)"
          value={formatNewtons(m.impact.inertialN)}
          sub={`${(m.impact.impactShare * 100).toFixed(0)}% of total`}
        />
        <Headline
          icon={<ArrowLeftRight className="h-3 w-3 text-violet-400" />}
          label="Worst asymmetry"
          value={worstAsym ? `${worstAsym.indexPct.toFixed(0)}%` : '—'}
          sub={worstAsym ? `${worstAsym.pair} · ${worstAsym.band}` : 'no paired joints'}
          valueColor={worstAsym ? bandColor(worstAsym.band) : undefined}
        />
      </div>

      {/* Confidence band */}
      <div className="px-3 py-1.5 border-b border-gray-700/40 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">Anthropometric confidence band</span>
        <span className="text-[10px] text-gray-200 tabular-nums">
          {m.confidence.label} (1σ)
        </span>
      </div>

      {/* Top joints with rate, peak, dose */}
      <div className="px-3 py-2 border-b border-gray-700/40">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Top loaded joints</div>
        <div className="space-y-1.5">
          {topJoints.length === 0 && (
            <div className="text-[11px] italic text-gray-500">Move the patient to start collecting frames.</div>
          )}
          {topJoints.map(j => {
            const cat = getCategoryEntry(j.jointId);
            const cit = cat ? CITATIONS[cat.citationId] : null;
            return (
              <div
                key={j.jointId}
                className="bg-gray-800/60 rounded-md px-2 py-1.5 border border-gray-700/50"
                data-testid={`ftp-joint-${j.jointId}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] text-gray-200 font-medium truncate">{j.label}</span>
                    {cit && (
                      <button
                        onClick={() => setOpenCitation(cit)}
                        className="text-gray-500 hover:text-amber-300"
                        title={cit.title}
                      >
                        <Info className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-amber-300 tabular-nums whitespace-nowrap">
                    {formatNewtons(j.peakForceN)} peak
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  <Mini label="ROL" value={`${Math.round(j.peakRateNps)} N/s`} />
                  <Mini label="@peak" value={formatMs(j.peakForceAtMs)} />
                  <Mini label="dose>high" value={formatMs(j.doseMs.high + j.doseMs.very_high)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Linked-segment chain (foot → trunk) */}
      <div className="px-3 py-2 border-b border-gray-700/40">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Linked-segment chain</div>
          <button
            onClick={() => setOpenCitation(CITATIONS.de_leva)}
            className="text-gray-500 hover:text-amber-300"
            title="de Leva (1996) segment masses"
          >
            <Info className="h-2.5 w-2.5" />
          </button>
        </div>
        <div className="space-y-0.5">
          {linkedSegments.map((seg, i) => {
            const max = linkedSegments[linkedSegments.length - 1].axialN || 1;
            const pct = (seg.axialN / max) * 100;
            return (
              <div key={seg.name} className="flex items-center gap-2 text-[10px]">
                <span className="w-16 text-gray-300 truncate">{seg.name}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-14 text-right text-gray-200 tabular-nums">{formatNewtons(seg.axialN)}</span>
              </div>
            );
          })}
        </div>
        <div className="text-[9px] text-gray-500 mt-1 leading-tight">
          Bottom-up sum of body weight + inertial share at 70 kg reference. Each level carries the load of every segment above it.
        </div>
      </div>

      {/* Asymmetry list */}
      {m.asymmetry.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-700/40">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">L / R asymmetry</div>
          <div className="space-y-1">
            {m.asymmetry.map(a => (
              <div key={a.pair} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-300 capitalize">{a.pair}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    L {formatNewtons(a.leftAvgN)} · R {formatNewtons(a.rightAvgN)}
                  </span>
                  <span
                    className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded"
                    style={{ color: bandColor(a.band), background: `${bandColor(a.band)}22` }}
                  >
                    {a.indexPct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patient state threshold reference */}
      <div className="px-3 py-2 border-b border-gray-700/40">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">
          {patientStateLabel(patientState)} thresholds
        </div>
        <div className="space-y-1">
          {THRESHOLD_TABLE.map(t => {
            const band = t.bands[patientState];
            const cit = CITATIONS[t.citationId];
            return (
              <div key={t.category} className="flex items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-1 text-gray-300 min-w-0">
                  <span className="truncate">{t.label}</span>
                  {cit && (
                    <button
                      onClick={() => setOpenCitation(cit)}
                      className="text-gray-500 hover:text-amber-300 flex-shrink-0"
                      title={cit.title}
                    >
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
                <span className="text-gray-400 tabular-nums whitespace-nowrap">
                  <span style={{ color: '#22c55e' }}>{Math.round(band.safeN)}</span>
                  {' / '}
                  <span style={{ color: '#eab308' }}>{Math.round(band.warnN)}</span> N
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrub-back timeline */}
      {m.frameCount > 1 && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Scrub buffer</span>
            <button
              onClick={() => {
                if (playbackRel != null) {
                  forceTimeBuffer.setPlaybackTime(null);
                  onScrub(null);
                  setScrubValue(null);
                } else {
                  forceTimeBuffer.setPlaybackTime(m.latestRelMs);
                  onScrub(m.latestRelMs);
                  setScrubValue(m.latestRelMs);
                }
              }}
              className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1"
              data-testid="ftp-scrub-toggle"
            >
              {playbackRel != null ? <><Play className="h-3 w-3" />Resume live</> : <><Pause className="h-3 w-3" />Pause to scrub</>}
            </button>
          </div>
          <div className="relative h-2 bg-gray-800 rounded-full overflow-visible">
            {/* Peak markers */}
            {topJoints.slice(0, 3).map(j => {
              const pct = m.bufferLengthMs > 0 ? (j.peakForceAtMs / m.bufferLengthMs) * 100 : 0;
              return (
                <div
                  key={`peak-${j.jointId}`}
                  className="absolute top-0 bottom-0 w-[2px] bg-amber-400/80 pointer-events-none"
                  style={{ left: `${pct}%` }}
                  title={`Peak ${j.label} @ ${formatMs(j.peakForceAtMs)}`}
                />
              );
            })}
            {m.impact.peakInertialAtMs > 0 && (
              <div
                className="absolute -top-1 -bottom-1 w-[2px] bg-orange-500/90 pointer-events-none"
                style={{
                  left: `${m.bufferLengthMs > 0 ? (m.impact.peakInertialAtMs / m.bufferLengthMs) * 100 : 0}%`,
                }}
                title={`Peak impact @ ${formatMs(m.impact.peakInertialAtMs)}`}
              />
            )}
            {playbackRel != null && (
              <div
                className="absolute -top-1 -bottom-1 w-[3px] bg-cyan-300 pointer-events-none"
                style={{
                  left: `${m.bufferLengthMs > 0 ? (playbackRel / m.bufferLengthMs) * 100 : 0}%`,
                }}
              />
            )}
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, m.bufferLengthMs)}
            step={Math.max(1, m.bufferLengthMs / 200)}
            value={scrubValue ?? playbackRel ?? m.bufferLengthMs}
            onChange={e => handleScrub(parseFloat(e.target.value))}
            onMouseUp={() => {/* keep selected scrub frame */}}
            onDoubleClick={handleScrubEnd}
            className="w-full mt-1 accent-amber-400"
            data-testid="ftp-scrub"
          />
          <div className="flex items-center justify-between text-[9px] text-gray-500 tabular-nums mt-0.5">
            <span>0 ms</span>
            <span>{formatMs(m.bufferLengthMs)}</span>
          </div>
          <div className="text-[9px] text-gray-400 mt-1">
            <span className="inline-block w-2 h-2 align-middle mr-1 bg-amber-400/80" /> peak force
            <span className="inline-block w-2 h-2 align-middle mx-1 ml-3 bg-orange-500/90" /> peak impact
            <span className="inline-block w-2 h-2 align-middle mx-1 ml-3 bg-cyan-300" /> scrub
          </div>
        </div>
      )}

      {/* Sanity warnings */}
      {m.sanityWarnings.length > 0 && (
        <div className="px-3 py-1.5 border-t border-red-500/30 bg-red-500/10">
          <span className="text-[10px] text-red-300">
            ⚠ Sanity check: {m.sanityWarnings.slice(0, 3).join('; ')}
          </span>
        </div>
      )}

      {/* Citation popover */}
      {openCitation && (
        <CitationPopover citation={openCitation} onClose={() => setOpenCitation(null)} />
      )}
    </div>
  );
}

function Headline({ icon, label, value, sub, valueColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-gray-800/60 rounded-md px-2 py-1.5 border border-gray-700/50">
      <div className="flex items-center gap-1 text-[9px] text-gray-400 uppercase tracking-wider">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className="text-[13px] font-semibold tabular-nums mt-0.5"
        style={{ color: valueColor ?? '#f3f4f6' }}
      >
        {value}
      </div>
      {sub && <div className="text-[9px] text-gray-500 truncate">{sub}</div>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900/60 rounded px-1.5 py-0.5 border border-gray-700/40">
      <div className="text-[8px] text-gray-500 uppercase tracking-wider leading-none">{label}</div>
      <div className="text-[10px] text-gray-200 tabular-nums">{value}</div>
    </div>
  );
}

function CitationPopover({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div
        ref={ref}
        className="w-[380px] bg-gray-900 rounded-xl border border-amber-500/40 shadow-2xl p-4"
        data-testid="ftp-citation"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">Source</div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="text-sm text-white font-semibold leading-snug">{citation.title}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {citation.authors} · {citation.year} · {citation.source}
        </div>
        <div className="text-[12px] text-gray-200 leading-relaxed mt-2">
          {citation.blurb}
        </div>
      </div>
    </div>
  );
}
