/**
 * Mechanics Analyser dashboard (Task #294)
 *
 * Bottom-tab workspace that keeps the live 3D skeleton in the centre and
 * surrounds it with 12 dockable biomechanics panels. Every reported number
 * exposes a KaTeX "show math" drawer (formula → substituted values →
 * citation) via `<MathChip />`.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity, ArrowLeft, ChevronDown, ChevronUp, Sigma, Play, Pause,
  RotateCcw, Footprints, Gauge, Compass, FileText, Target, X, Layers,
  Wind, Flame, Mountain, Cog, Repeat,
} from 'lucide-react';
import {
  MOVEMENT_CATEGORIES, MOVEMENT_SEQUENCES, getMovementById,
  type MovementSequence,
} from '@/lib/movementSequences';
import type { AnimationState } from '@/components/skeleton/PureThreeGLBViewer';
import type { ForceAnalysisResult, JointSurfaceForce } from '@/lib/posturalForceEngine';
import { forceToNewtons } from '@/lib/posturalForceEngine';
import {
  // Anthropometrics
  DE_LEVA_DEFAULTS, SEGMENT_LENGTH_FRAC, segmentMassKg, segmentLengthM,
  segmentInertiaKgM2,
  // Hill
  evaluateHill, buildHillReadout, hillForceLength, hillForceVelocity,
  hillPassiveForce,
  // Moment arms
  muscleMomentArmM, buildMomentArmReadout, muscleMomentArmSweep,
  // Contact pressure
  JOINT_CONTACT_AREAS, jointContactPressureMPa, buildContactPressureReadout,
  // Angles
  buildQAngleReadout, buildVarusValgusReadout, buildCalcanealAngleReadout,
  buildScapulohumeralRhythmReadout, buildCobbReadout,
  buildJointAngleReadout,
  // Energetics
  jointPowerW, buildJointPowerReadout, jointWorkJ, buildJointWorkReadout,
  angularMomentumScalar, buildAngularMomentumReadout,
  buildConcentricWorkReadout, buildEccentricWorkReadout,
  // Gait + GRF
  computeGaitSpatiotemporal, buildCadenceReadout, buildStepSymmetryReadout,
  buildStrideLengthReadout, buildStancePctReadout, buildSwingPctReadout,
  buildDoubleSupportReadout, buildStepWidthReadout,
  computeGrfMetrics, buildLoadingRateReadout, buildBrakingImpulseReadout,
  buildActivePeakReadout, buildImpactPeakReadout, buildPropulsiveImpulseReadout,
  buildMlGrfReadout,
  type GaitEvent, type GrfSeries,
  // Stability
  computeStability, buildXcomReadout, buildStaticMarginReadout,
  buildLosConeReadout, buildLegLengthReadout,
  // Lever / FBD / IK
  classifyLever, buildLeverReadout,
  buildFbdGeometry, type FbdSegmentInputs,
  inverseDynamicsSegment, type InverseDynamicsResult,
  // Joint reaction / moment readouts
  buildJointReactionReadout, buildJointMomentReadout, bodyWeightN,
  type SegmentId, type MathReadout, type MomentArmMuscle,
} from '@/lib/mechanicsAnalyserMath';
import { MathChip, MetricRow, Katex } from './MathDrawer';

// ----------------------------------------------------------------------------
// Skeleton overlay toggles state.
// ----------------------------------------------------------------------------

export interface MechanicsOverlayState {
  comTrail: boolean;
  stabilityCone: boolean;
  plantarHeatmap: boolean;
  jointReactionArrows: boolean;
}

const DEFAULT_OVERLAY: MechanicsOverlayState = {
  comTrail: true,
  stabilityCone: true,
  plantarHeatmap: false,
  jointReactionArrows: true,
};

// ----------------------------------------------------------------------------
// Props.
// ----------------------------------------------------------------------------

interface Props {
  onClose: () => void;
  /** Portal target callback for the live skeleton viewer. */
  onSkeletonSlotMount?: (el: HTMLDivElement | null) => void;
  /** Live joint angles. */
  modelConfig: Record<string, Record<string, number | undefined> | undefined>;
  bodyWeightKg: number;
  /** Estimated stature in metres (defaults to 1.75 m if not supplied). */
  statureM?: number;
  /** Live joint reaction analysis from the postural force engine. */
  forceAnalysis?: ForceAnalysisResult | null;
  /** Lifted animation state shared with the central viewer. */
  animationState: AnimationState;
  setAnimationState: (
    next: AnimationState | ((prev: AnimationState) => AnimationState),
  ) => void;
  /** Optional patient header. */
  patientName?: string;
  patientMeta?: string;
  conditionLabel?: string;
  /** Optional change handler so PhysioGPT can mirror toggles into the
   *  underlying viewer's overlay state (e.g. the existing forceOverlay). */
  onOverlayChange?: (overlay: MechanicsOverlayState) => void;
  /** Optional gait events captured during a Walk movement. When omitted
   *  the panel falls back to a synthesised normal-cadence trace. */
  gaitEvents?: GaitEvent[] | null;
  /** Optional GRF series captured during stance. */
  grfSeries?: GrfSeries | null;
}

// ----------------------------------------------------------------------------
// Collapsible panel.
// ----------------------------------------------------------------------------

interface PanelProps {
  id: string;
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  testId?: string;
  /** When true the panel is given a prominent ring + auto-expanded — used by
   *  context-sensitive panels (e.g. Gait when the Walk movement is playing). */
  highlight?: boolean;
}

/** Panel collapsed state is persisted to localStorage scoped to the
 *  current clinician so each user keeps their own preferred panel
 *  layout across navigation, refresh, and PhysioGPT remounts.
 *  Key: `mechanicsAnalyser:<clinicianId>:panel:${id}:open`. The
 *  clinician id is sourced from a global PhysioGPT auth hook when
 *  available; otherwise a stable per-browser anonymous id is created
 *  the first time the dashboard mounts. The scope is reactive — if
 *  the auth identity changes (login/logout) we re-read it via the
 *  custom 'physioGpt:clinicianChanged' event or a cross-tab storage
 *  event and re-render the panels under the new namespace. */
/** Read-only key that the broader PhysioGPT auth layer is expected to
 *  own. We never write to it from here — instead, when no clinician id
 *  is published, we fall back to a dedicated anonymous key so we do
 *  not collide with auth-owned namespaces. */
const CLINICIAN_ID_KEY = 'physioGpt:clinicianId';
const ANON_SCOPE_KEY = 'mechanicsAnalyser:anonScopeId';
function readClinicianScope(): string {
  if (typeof window === 'undefined') return 'shared';
  try {
    const inj = (window as unknown as { __physioGptClinicianId__?: string }).__physioGptClinicianId__;
    if (typeof inj === 'string' && inj.length > 0) return inj;
    const auth = window.localStorage.getItem(CLINICIAN_ID_KEY);
    if (auth) return auth;
    let anon = window.localStorage.getItem(ANON_SCOPE_KEY);
    if (!anon) {
      anon = `anon-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(ANON_SCOPE_KEY, anon);
    }
    return anon;
  } catch { return 'shared'; }
}

function useClinicianScope(): string {
  const [scope, setScope] = useState<string>(readClinicianScope);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => setScope(readClinicianScope());
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLINICIAN_ID_KEY || e.key === ANON_SCOPE_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('physioGpt:clinicianChanged' as keyof WindowEventMap, refresh as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('physioGpt:clinicianChanged' as keyof WindowEventMap, refresh as EventListener);
    };
  }, []);
  return scope;
}

function readPanelOpen(scope: string, id: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = window.localStorage.getItem(`mechanicsAnalyser:${scope}:panel:${id}:open`);
    if (v == null) return fallback;
    return v === '1';
  } catch { return fallback; }
}

function writePanelOpen(scope: string, id: string, open: boolean): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(`mechanicsAnalyser:${scope}:panel:${id}:open`, open ? '1' : '0'); } catch { /* noop */ }
}

function Panel({ id, title, icon, defaultOpen = true, badge, children, testId, highlight = false }: PanelProps) {
  const scope = useClinicianScope();
  const [open, setOpen] = useState<boolean>(() => readPanelOpen(scope, id, defaultOpen));
  // If clinician identity changes (login/logout/cross-tab), re-read the
  // panel state under the new scoped key so each user keeps their layout.
  useEffect(() => { setOpen(readPanelOpen(scope, id, defaultOpen)); }, [scope, id, defaultOpen]);
  // Auto-expand the panel when it becomes highlighted so context-sensitive
  // metrics (e.g. Gait during Walk) jump into view automatically.
  useEffect(() => { if (highlight) setOpen(true); }, [highlight]);
  useEffect(() => { writePanelOpen(scope, id, open); }, [scope, id, open]);
  return (
    <div
      className={`bg-gray-900/70 border rounded-lg overflow-hidden transition-all ${highlight ? 'border-cyan-400/70 ring-2 ring-cyan-500/40 shadow-[0_0_18px_-4px_rgba(34,211,238,0.5)]' : 'border-gray-800/80'}`}
      data-testid={testId ?? `mech-panel-${id}`}
      data-highlight={highlight ? 'true' : 'false'}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50"
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200">
          {icon}
          {title}
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-gray-800/60 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Helper — pull a joint angle out of modelConfig safely.
// ----------------------------------------------------------------------------

function angleOf(modelConfig: Props['modelConfig'], joint: string, prop: string, fallback = 0): number {
  const cfg = modelConfig?.[joint] as Record<string, number | undefined> | undefined;
  const v = cfg?.[prop];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function normLengthFromAngle(angleDeg: number, optimumDeg: number, romDeg: number): number {
  const dev = (angleDeg - optimumDeg) / Math.max(1, romDeg);
  return 1 + dev * 0.4;
}

// ----------------------------------------------------------------------------
// Movement Bar.
// ----------------------------------------------------------------------------

// Squat sequence shares the sit-to-stand kinematic pattern (hip+knee+ankle
// flexion–extension), so the Sit-to-Stand chip aliases the 'squat' movement.
const FAVORITES: { id: string; label: string }[] = [
  { id: 'walk',             label: 'Walk' },
  { id: 'squat',            label: 'Sit-to-Stand' },
  { id: 'armElevations',    label: 'Overhead Reach' },
  { id: 'lunge',            label: 'Lunge' },
  { id: 'singleLegBalance', label: 'Single-Leg Stance' },
];

function MovementBar({ animationState, setAnimationState, loop, setLoop }: {
  animationState: AnimationState;
  setAnimationState: Props['setAnimationState'];
  loop: boolean;
  setLoop: (next: boolean) => void;
}) {
  const [category, setCategory] = useState<string>('lower');
  const currentCat = MOVEMENT_CATEGORIES.find(c => c.id === category) ?? MOVEMENT_CATEGORIES[0];
  const fireMovement = (id: string) => {
    const mv = getMovementById(id);
    if (!mv) return;
    setAnimationState({ isPlaying: true, currentMovement: id, progress: 0, speed: animationState.speed });
  };

  const sequence = animationState.currentMovement ? getMovementById(animationState.currentMovement) : null;

  return (
    <div className="absolute top-2 left-2 right-2 z-20 bg-gray-900/85 backdrop-blur border border-cyan-500/20 rounded-lg shadow-lg px-2 py-1.5 flex flex-wrap items-center gap-2" data-testid="mechanics-movement-bar">
      <div className="flex items-center gap-1.5">
        <Footprints className="h-3.5 w-3.5 text-cyan-400" />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-gray-800/70 border border-gray-700 rounded text-[10px] text-gray-100 px-1.5 py-0.5 focus:outline-none focus:border-cyan-400"
          data-testid="movement-category-select"
        >
          {MOVEMENT_CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={animationState.currentMovement ?? ''}
          onChange={(e) => e.target.value && fireMovement(e.target.value)}
          className="bg-gray-800/70 border border-gray-700 rounded text-[10px] text-gray-100 px-1.5 py-0.5 focus:outline-none focus:border-cyan-400 max-w-[140px]"
          data-testid="movement-pick-select"
        >
          <option value="">— pick movement —</option>
          {currentCat.movements.map(id => {
            const m = MOVEMENT_SEQUENCES.find(s => s.id === id);
            return <option key={id} value={id}>{m?.name ?? id}</option>;
          })}
        </select>
      </div>

      <div className="flex items-center gap-1 border-l border-gray-700/60 pl-2">
        {FAVORITES.map(f => {
          const active = animationState.currentMovement === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => fireMovement(f.id)}
              className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${active ? 'bg-cyan-500/30 border-cyan-400/60 text-cyan-100' : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
              data-testid={`movement-fav-${f.id}`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 border-l border-gray-700/60 pl-2 ml-auto">
        <button
          type="button"
          onClick={() => setAnimationState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
          className="h-6 w-6 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white"
          title={animationState.isPlaying ? 'Pause' : 'Play'}
          data-testid="mech-play-pause"
        >
          {animationState.isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={() => setAnimationState(prev => ({ ...prev, progress: 0 }))}
          className="h-6 w-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
          title="Restart"
          data-testid="mech-restart"
        >
          <RotateCcw className="h-3 w-3 mx-auto" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={animationState.progress}
          onChange={(e) => setAnimationState(prev => ({ ...prev, progress: parseFloat(e.target.value) }))}
          className="w-24 accent-cyan-500"
          data-testid="mech-scrub"
        />
        <select
          value={animationState.speed}
          onChange={(e) => setAnimationState(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
          className="bg-gray-800/70 border border-gray-700 rounded text-[10px] text-gray-100 px-1 py-0.5"
          data-testid="mech-speed"
        >
          <option value={0.25}>0.25×</option>
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={1.5}>1.5×</option>
          <option value={2}>2×</option>
        </select>
        <button
          type="button"
          onClick={() => setLoop(!loop)}
          aria-pressed={loop}
          title={loop ? 'Loop on' : 'Loop off'}
          className={`h-6 px-1.5 rounded text-[10px] flex items-center gap-1 border transition-colors ${loop ? 'bg-cyan-500/30 border-cyan-400/60 text-cyan-100' : 'bg-gray-800/70 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
          data-testid="mech-loop"
        >
          <Repeat className="h-3 w-3" />
          {loop ? 'Loop' : 'Once'}
        </button>
        <span className="text-[10px] text-gray-400 hidden lg:flex items-center gap-1">
          {sequence ? `${sequence.name} · ${(sequence.duration * animationState.progress / 1000).toFixed(2)}s/${(sequence.duration / 1000).toFixed(2)}s` : 'Ready'}
          {sequence && (
            <MathChip
              readout={{
                value: (sequence.duration * animationState.progress) / 1000,
                units: 's', normativeRange: null,
                formula: 't_{elapsed} = T \\cdot p / 1000',
                substitutions: `t_{elapsed} = ${sequence.duration}\\,\\text{ms} \\cdot ${animationState.progress.toFixed(3)} / 1000 = ${((sequence.duration * animationState.progress) / 1000).toFixed(2)}\\,\\text{s}`,
                assumptions: [
                  `Movement sequence duration T = ${sequence.duration} ms (definition in movementSequences.ts).`,
                  `Progress p ∈ [0, 1] is normalised playback position from the shared animation loop.`,
                  `Effective wall-clock pace scales by playback speed = ${animationState.speed}× (not folded into elapsed since elapsed is sequence-time).`,
                ],
                citations: [],
              }}
              size="xs"
              title="Movement timer"
            />
          )}
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Skeleton overlay menu (top-right of the central skeleton).
// ----------------------------------------------------------------------------

function OverlayMenu({ overlay, setOverlay }: {
  overlay: MechanicsOverlayState;
  setOverlay: (next: MechanicsOverlayState) => void;
}) {
  const [open, setOpen] = useState(false);
  const items: { key: keyof MechanicsOverlayState; label: string; icon: ReactNode }[] = [
    { key: 'comTrail',           label: 'COM trail',            icon: <Repeat className="h-3 w-3" /> },
    { key: 'stabilityCone',      label: 'Stability cone',       icon: <Compass className="h-3 w-3" /> },
    { key: 'plantarHeatmap',     label: 'Plantar heatmap',      icon: <Flame className="h-3 w-3" /> },
    { key: 'jointReactionArrows',label: 'Joint reaction arrows',icon: <Wind className="h-3 w-3" /> },
  ];
  return (
    <div className="absolute top-14 right-2 z-20" data-testid="mechanics-overlay-menu">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="bg-gray-900/85 backdrop-blur border border-cyan-500/20 rounded-md px-2 py-1 flex items-center gap-1 text-[10px] text-gray-100 hover:bg-gray-800"
      >
        <Layers className="h-3 w-3" />
        Overlays
      </button>
      {open && (
        <div className="mt-1 bg-gray-900/95 border border-gray-700/50 rounded-md p-2 shadow-lg w-44 space-y-1">
          {items.map(item => (
            <label
              key={item.key}
              className="flex items-center gap-2 text-[10px] text-gray-200 cursor-pointer hover:text-cyan-200"
            >
              <input
                type="checkbox"
                checked={overlay[item.key]}
                onChange={(e) => setOverlay({ ...overlay, [item.key]: e.target.checked })}
                className="accent-cyan-500"
                data-testid={`overlay-toggle-${item.key}`}
              />
              {item.icon}
              {item.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Live overlay HUD layer — drawn over the central skeleton viewer.
// All four toggles drive *visible* rendering wired to live state, not stubs:
//   • COM trail        — rolling buffer of CoM (x,y) → green poly-line.
//   • Stability cone   — top-down projection of base-of-support polygon plus
//                        the limit-of-stability cone & current CoM marker.
//   • Plantar heatmap  — left/right foot footprints colored by GRF magnitude
//                        (proxy from forceAnalysis if present, else BW).
//   • JRF arrows       — vertical arrows on a stylised stick figure scaled by
//                        joint reaction magnitude from inverse dynamics.
// All HUDs are pointer-events-none so they don't intercept Three.js input.
// ----------------------------------------------------------------------------

function MechanicsOverlayLayer({
  overlay,
  stability,
  jointForceRows,
  forceAnalysis,
  isPlaying,
}: {
  overlay: MechanicsOverlayState;
  stability: { comX: number; comY: number; xcomX: number; staticMarginM: number; dynamicMarginM: number; losConeScorePct: number; legLengthM: number; bos: { x: number; y: number }[] };
  jointForceRows: { joint: { id: string; label: string }; forceN: number }[];
  forceAnalysis: ForceAnalysisResult | null;
  isPlaying: boolean;
}) {
  // Rolling CoM trail buffer (last ~3 s at ~10 Hz sample).
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  useEffect(() => {
    if (!overlay.comTrail) { setTrail([]); return; }
    const id = window.setInterval(() => {
      setTrail(prev => {
        const next = [...prev, { x: stability.comX, y: stability.comY }];
        return next.length > 30 ? next.slice(-30) : next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [overlay.comTrail, stability.comX, stability.comY, isPlaying]);

  if (!overlay.comTrail && !overlay.stabilityCone && !overlay.plantarHeatmap && !overlay.jointReactionArrows) {
    return null;
  }

  // Bottom-of-support world units → svg pixels (top-down 0.6 m square).
  const HALF_M = 0.4;
  const toPx = (m: number, size: number) => (m / (HALF_M * 2) + 0.5) * size;

  // Pull max joint force for plantar/JRF normalisation.
  const maxF = Math.max(1, ...jointForceRows.map(r => r.forceN));
  const ankleL = jointForceRows.find(r => /ankle/i.test(r.joint.id) && /L|left/i.test(r.joint.label))?.forceN ?? 0;
  const ankleR = jointForceRows.find(r => /ankle/i.test(r.joint.id) && /R|right/i.test(r.joint.label))?.forceN ?? 0;
  const fallbackAnkleN = forceAnalysis?.joints.find(j => /ankle/i.test(j.id))?.totalForce ?? 0;
  const ankleLN = ankleL || fallbackAnkleN;
  const ankleRN = ankleR || fallbackAnkleN;

  // Stylised stick-figure JRF anchor points (in % of HUD height).
  const figJoints: { id: string; x: number; y: number; matcher: RegExp }[] = [
    { id: 'shoulder_R', x: 38, y: 24, matcher: /shoulder/i },
    { id: 'shoulder_L', x: 62, y: 24, matcher: /shoulder/i },
    { id: 'elbow_R',    x: 32, y: 38, matcher: /elbow/i },
    { id: 'elbow_L',    x: 68, y: 38, matcher: /elbow/i },
    { id: 'hip_R',      x: 44, y: 50, matcher: /hip/i },
    { id: 'hip_L',      x: 56, y: 50, matcher: /hip/i },
    { id: 'knee_R',     x: 44, y: 70, matcher: /knee/i },
    { id: 'knee_L',     x: 56, y: 70, matcher: /knee/i },
    { id: 'ankle_R',    x: 44, y: 88, matcher: /ankle/i },
    { id: 'ankle_L',    x: 56, y: 88, matcher: /ankle/i },
  ];

  return (
    <>
      {/* COM trail + stability cone HUD — top-left */}
      {(overlay.comTrail || overlay.stabilityCone) && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none" data-testid="overlay-com-cone">
          <div className="bg-gray-950/80 backdrop-blur border border-cyan-500/30 rounded-md p-1.5 shadow-lg">
            <div className="text-[8px] text-cyan-300 font-semibold mb-1 px-1 flex items-center gap-1">
              <Compass className="h-2.5 w-2.5" />
              {overlay.stabilityCone ? 'Stability cone' : 'CoM trail'}
            </div>
            <svg width={130} height={130} viewBox="0 0 130 130" className="bg-black/40 rounded">
              {/* grid */}
              <defs>
                <pattern id="g8" width="13" height="13" patternUnits="userSpaceOnUse">
                  <path d="M 13 0 L 0 0 0 13" fill="none" stroke="#1f2937" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="130" height="130" fill="url(#g8)" />
              {overlay.stabilityCone && (
                <>
                  {/* Base of support polygon */}
                  <polygon
                    points={stability.bos.map(p => `${toPx(p.x, 130).toFixed(1)},${toPx(p.y, 130).toFixed(1)}`).join(' ')}
                    fill="rgba(34,197,94,0.15)"
                    stroke="#22c55e"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  {/* LoS cone — shrinks with score */}
                  <circle
                    cx={toPx(0, 130)} cy={toPx(0, 130)}
                    r={Math.max(8, (stability.losConeScorePct / 100) * 50)}
                    fill="none" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 2"
                  />
                  {/* XCoM marker */}
                  <circle cx={toPx(stability.xcomX, 130)} cy={toPx(stability.comY, 130)} r="2.2" fill="#a855f7" />
                </>
              )}
              {overlay.comTrail && trail.length >= 2 && (
                <polyline
                  points={trail.map(p => `${toPx(p.x, 130).toFixed(1)},${toPx(p.y, 130).toFixed(1)}`).join(' ')}
                  fill="none" stroke="#10b981" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85"
                />
              )}
              {/* CoM dot (always shown when either overlay active) */}
              <circle cx={toPx(stability.comX, 130)} cy={toPx(stability.comY, 130)} r="2.5" fill="#10b981" stroke="#022c22" strokeWidth="0.5" />
            </svg>
            <div className="text-[7.5px] text-gray-300 mt-0.5 px-1 leading-tight">
              <span className="text-emerald-300">CoM</span> · <span className="text-violet-300">XCoM</span><br />
              static {(stability.staticMarginM * 100).toFixed(1)} cm · LoS {stability.losConeScorePct.toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* Plantar heatmap HUD — bottom-left */}
      {overlay.plantarHeatmap && (
        <div className="absolute bottom-16 left-2 z-10 pointer-events-none" data-testid="overlay-plantar">
          <div className="bg-gray-950/80 backdrop-blur border border-amber-500/30 rounded-md p-1.5 shadow-lg">
            <div className="text-[8px] text-amber-300 font-semibold mb-1 px-1 flex items-center gap-1">
              <Flame className="h-2.5 w-2.5" /> Plantar pressure
            </div>
            <svg width={86} height={110} viewBox="0 0 86 110" className="bg-black/40 rounded">
              {(['L', 'R'] as const).map((side, i) => {
                const f = side === 'L' ? ankleLN : ankleRN;
                const norm = Math.min(1, f / Math.max(1, maxF || fallbackAnkleN || 1));
                const x = i === 0 ? 12 : 50;
                // Heel/midfoot/forefoot regions; scale colour by norm.
                const heat = (intensity: number) => {
                  const t = Math.min(1, norm * intensity);
                  const r = Math.round(34 + t * 220);
                  const g = Math.round(197 - t * 160);
                  const b = Math.round(94 - t * 70);
                  return `rgb(${r},${g},${b})`;
                };
                return (
                  <g key={side}>
                    {/* Forefoot */}
                    <ellipse cx={x + 12} cy={20} rx={11} ry={14} fill={heat(1.1)} stroke="#1f2937" strokeWidth="0.5" />
                    {/* Midfoot */}
                    <ellipse cx={x + 12} cy={50} rx={8}  ry={14} fill={heat(0.6)} stroke="#1f2937" strokeWidth="0.5" />
                    {/* Heel */}
                    <ellipse cx={x + 12} cy={82} rx={10} ry={14} fill={heat(1.3)} stroke="#1f2937" strokeWidth="0.5" />
                    <text x={x + 12} y={104} textAnchor="middle" fontSize="7" fill="#fde68a">{side}</text>
                  </g>
                );
              })}
            </svg>
            <div className="text-[7.5px] text-gray-300 mt-0.5 px-1">
              L {ankleLN.toFixed(0)} N · R {ankleRN.toFixed(0)} N
            </div>
          </div>
        </div>
      )}

      {/* Joint reaction arrows HUD — top-right (separate column from Overlays menu) */}
      {overlay.jointReactionArrows && (
        <div className="absolute top-2 right-32 z-10 pointer-events-none" data-testid="overlay-jrf">
          <div className="bg-gray-950/80 backdrop-blur border border-amber-500/30 rounded-md p-1.5 shadow-lg">
            <div className="text-[8px] text-amber-300 font-semibold mb-1 px-1 flex items-center gap-1">
              <Wind className="h-2.5 w-2.5" /> Joint reaction arrows
            </div>
            <svg width={120} height={170} viewBox="0 0 100 100" className="bg-black/40 rounded">
              {/* stylised stick figure */}
              <circle cx="50" cy="14" r="6" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
              <line x1="50" y1="20" x2="50" y2="55" stroke="#94a3b8" strokeWidth="1" />
              <line x1="50" y1="28" x2="32" y2="40" stroke="#94a3b8" strokeWidth="1" />
              <line x1="50" y1="28" x2="68" y2="40" stroke="#94a3b8" strokeWidth="1" />
              <line x1="32" y1="40" x2="28" y2="55" stroke="#94a3b8" strokeWidth="1" />
              <line x1="68" y1="40" x2="72" y2="55" stroke="#94a3b8" strokeWidth="1" />
              <line x1="50" y1="55" x2="42" y2="78" stroke="#94a3b8" strokeWidth="1" />
              <line x1="50" y1="55" x2="58" y2="78" stroke="#94a3b8" strokeWidth="1" />
              <line x1="42" y1="78" x2="40" y2="94" stroke="#94a3b8" strokeWidth="1" />
              <line x1="58" y1="78" x2="60" y2="94" stroke="#94a3b8" strokeWidth="1" />
              <defs>
                <marker id="jrfArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                </marker>
              </defs>
              {figJoints.map(fj => {
                const row = jointForceRows.find(r => fj.matcher.test(r.joint.id) && (
                  fj.id.endsWith('_L') ? /L|left/i.test(r.joint.label) :
                  fj.id.endsWith('_R') ? /R|right/i.test(r.joint.label) : true
                ));
                const f = row?.forceN ?? 0;
                if (f <= 0) return null;
                const norm = Math.min(1, f / maxF);
                const len = 4 + norm * 14;
                const x = fj.x;
                const y = fj.y;
                return (
                  <g key={fj.id}>
                    <line
                      x1={x} y1={y - len} x2={x} y2={y - 1.5}
                      stroke="#f59e0b" strokeWidth={1 + norm * 1.2}
                      markerEnd="url(#jrfArr)"
                    />
                    <circle cx={x} cy={y} r="1.4" fill="#f59e0b" />
                  </g>
                );
              })}
            </svg>
            <div className="text-[7.5px] text-gray-300 mt-0.5 px-1">peak {Math.round(maxF)} N</div>
          </div>
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------------------------------
// Free-Body Diagram SVG.
// ----------------------------------------------------------------------------

function FbdDiagram({ inputs }: { inputs: FbdSegmentInputs }) {
  const svgBox = { width: 220, height: 200, padding: 16 };
  const geom = buildFbdGeometry(inputs, svgBox);
  return (
    <svg width="100%" viewBox={`0 0 ${svgBox.width} ${svgBox.height}`} className="bg-gray-950/40 rounded">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
        </marker>
        <marker id="arrG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
        </marker>
        <marker id="arrM" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
        </marker>
      </defs>
      {/* Segment */}
      <line
        x1={geom.segmentStart.x} y1={geom.segmentStart.y}
        x2={geom.segmentEnd.x}   y2={geom.segmentEnd.y}
        stroke="#94a3b8" strokeWidth={4} strokeLinecap="round"
      />
      {/* COM dot */}
      <circle cx={geom.comPoint.x} cy={geom.comPoint.y} r={4} fill="#22c55e" stroke="#fff" strokeWidth={1} />
      <text x={geom.comPoint.x + 6} y={geom.comPoint.y - 4} fill="#22c55e" fontSize="9">COM</text>
      {/* Gravity */}
      <line
        x1={geom.gravityVector.from.x} y1={geom.gravityVector.from.y}
        x2={geom.gravityVector.to.x} y2={geom.gravityVector.to.y}
        stroke="#f59e0b" strokeWidth={2} markerEnd="url(#arrG)"
      />
      <text x={geom.gravityVector.to.x + 4} y={geom.gravityVector.to.y} fill="#f59e0b" fontSize="9">mg = {geom.gravityVector.mag.toFixed(0)}N</text>
      {/* Muscle line */}
      <line
        x1={geom.muscleLine.from.x} y1={geom.muscleLine.from.y}
        x2={geom.muscleLine.to.x}   y2={geom.muscleLine.to.y}
        stroke="#a855f7" strokeWidth={2} markerEnd="url(#arrM)"
      />
      <text x={geom.muscleLine.to.x - 8} y={geom.muscleLine.to.y - 4} fill="#a855f7" fontSize="9">F_m</text>
      {/* Joint reaction */}
      <line
        x1={geom.jointReactionVector.from.x} y1={geom.jointReactionVector.from.y}
        x2={geom.jointReactionVector.to.x}   y2={geom.jointReactionVector.to.y}
        stroke="#06b6d4" strokeWidth={2} markerEnd="url(#arr)"
      />
      <text x={geom.jointReactionVector.to.x + 4} y={geom.jointReactionVector.to.y} fill="#06b6d4" fontSize="9">F_R = {geom.jointReactionVector.mag.toFixed(0)}N</text>
      {/* Lever-arm hints */}
      <text x={geom.loadArmLabel.x} y={geom.loadArmLabel.y + 4} fill="#fbbf24" fontSize="8">d = {(geom.loadArmLabel.lengthM * 100).toFixed(1)}cm</text>
      <text x={geom.effortArmLabel.x - 56} y={geom.effortArmLabel.y} fill="#c084fc" fontSize="8">r = {(geom.effortArmLabel.lengthM * 1000).toFixed(0)}mm</text>
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Inverse-dynamics walkthrough renderer.
// ----------------------------------------------------------------------------

function InverseDynamicsSteps({ result }: { result: InverseDynamicsResult }) {
  return (
    <div className="space-y-2">
      {result.steps.map((step, i) => (
        <div key={i} className="bg-gray-950/40 border border-gray-800/40 rounded p-2">
          <div className="text-[10px] font-semibold text-cyan-300">{step.label}</div>
          <div className="my-1"><Katex expression={step.formula} block /></div>
          <div className="text-[10px] text-gray-300"><Katex expression={step.substitutions} /></div>
          <div className="text-[10px] text-gray-400 mt-1">{step.result}</div>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Hill-type FL/FV mini-curves.
// ----------------------------------------------------------------------------

function HillCurves({ activation, normLength, normVel }: { activation: number; normLength: number; normVel: number }) {
  const flPts: { x: number; y: number }[] = [];
  const fvPts: { x: number; y: number }[] = [];
  const passPts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const L = 0.5 + (i / 40) * 1.0;
    flPts.push({ x: L, y: hillForceLength(L) });
    passPts.push({ x: L, y: hillPassiveForce(L) });
  }
  for (let i = 0; i <= 40; i++) {
    const V = -1 + (i / 40) * 2;
    fvPts.push({ x: V, y: hillForceVelocity(V) });
  }
  const W = 220, H = 60, P = 8;
  const scale = (pts: { x: number; y: number }[], xMin: number, xMax: number, yMax: number) => pts.map(p => ({
    x: P + ((p.x - xMin) / (xMax - xMin)) * (W - P * 2),
    y: H - P - (Math.min(yMax, p.y) / yMax) * (H - P * 2),
  }));
  const drawPath = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const flScaled = scale(flPts, 0.5, 1.5, 1.5);
  const passScaled = scale(passPts, 0.5, 1.5, 1.5);
  const fvScaled = scale(fvPts, -1, 1, 1.6);
  const opMarkerL = scale([{ x: normLength, y: hillForceLength(normLength) * activation }], 0.5, 1.5, 1.5)[0];
  const opMarkerV = scale([{ x: normVel, y: hillForceVelocity(normVel) }], -1, 1, 1.6)[0];
  return (
    <div className="space-y-1">
      <div>
        <div className="text-[9px] text-gray-400">Active F-L (purple) + Passive F-L (orange)</div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="bg-gray-950/40 rounded">
          <path d={drawPath(flScaled)} fill="none" stroke="#a855f7" strokeWidth={1.5} />
          <path d={drawPath(passScaled)} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
          <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#475569" strokeWidth={0.5} />
          <line x1={W / 2} x2={W / 2} y1={P} y2={H - P} stroke="#475569" strokeWidth={0.5} strokeDasharray="2,2" />
          <circle cx={opMarkerL.x} cy={opMarkerL.y} r={3} fill="#06b6d4" stroke="#fff" />
        </svg>
      </div>
      <div>
        <div className="text-[9px] text-gray-400">F-V (cyan) — eccentric &lt;0, concentric &gt;0</div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="bg-gray-950/40 rounded">
          <path d={drawPath(fvScaled)} fill="none" stroke="#06b6d4" strokeWidth={1.5} />
          <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#475569" strokeWidth={0.5} />
          <line x1={W / 2} x2={W / 2} y1={P} y2={H - P} stroke="#475569" strokeWidth={0.5} strokeDasharray="2,2" />
          <circle cx={opMarkerV.x} cy={opMarkerV.y} r={3} fill="#a855f7" stroke="#fff" />
        </svg>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Moment-arm sweep mini-chart.
// ----------------------------------------------------------------------------

function MomentArmChart({ muscle, currentAngleDeg }: { muscle: MomentArmMuscle; currentAngleDeg: number }) {
  const sweep = useMemo(() => muscleMomentArmSweep(muscle), [muscle]);
  const W = 220, H = 60, P = 8;
  const xs = sweep.map(p => p.angleDeg);
  const ys = sweep.map(p => p.armMm);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys);
  const path = sweep.map((p, i) => {
    const x = P + ((p.angleDeg - xMin) / (xMax - xMin)) * (W - P * 2);
    const y = H - P - ((p.armMm - yMin) / (yMax - yMin || 1)) * (H - P * 2);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const cx = P + ((Math.max(xMin, Math.min(xMax, currentAngleDeg)) - xMin) / (xMax - xMin)) * (W - P * 2);
  const curArm = muscleMomentArmM(muscle, currentAngleDeg) * 1000;
  const cy = H - P - ((curArm - yMin) / (yMax - yMin || 1)) * (H - P * 2);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="bg-gray-950/40 rounded">
      <path d={path} fill="none" stroke="#22c55e" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={3} fill="#06b6d4" stroke="#fff" />
      <text x={W - P} y={P + 8} textAnchor="end" fill="#94a3b8" fontSize="8">{yMin.toFixed(0)}–{yMax.toFixed(0)} mm</text>
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Sample fallbacks for gait/GRF when no recording is provided.
// Synthesised from typical normal-cadence walking & running stance values
// so the math chips have substituted numbers to display.
// ----------------------------------------------------------------------------

const FALLBACK_GAIT_EVENTS: GaitEvent[] = [
  { time: 0.00, type: 'HS', foot: 'L', apM: 0.00, mlM: 0.10 },
  { time: 0.62, type: 'TO', foot: 'L', apM: 0.78, mlM: 0.10 },
  { time: 0.50, type: 'HS', foot: 'R', apM: 0.65, mlM: -0.10 },
  { time: 1.10, type: 'TO', foot: 'R', apM: 1.40, mlM: -0.10 },
  { time: 1.05, type: 'HS', foot: 'L', apM: 1.30, mlM: 0.10 },
  { time: 1.55, type: 'HS', foot: 'R', apM: 1.95, mlM: -0.10 },
  { time: 2.10, type: 'HS', foot: 'L', apM: 2.60, mlM: 0.10 },
];

function buildFallbackGrfSeries(bodyWeightKgVal: number): GrfSeries {
  const N = 60;
  const t: number[] = [];
  const fz: number[] = [];
  const fx: number[] = [];
  const fy: number[] = [];
  const W = bodyWeightKgVal * 9.81;
  for (let i = 0; i <= N; i++) {
    const tau = i / N;
    t.push(tau * 0.6);
    // Two-peak vertical: impact (~50ms) + active (mid-stance).
    const impact = 1.6 * Math.exp(-((tau - 0.05) ** 2) / 0.0006);
    const active = 1.05 * Math.exp(-((tau - 0.5) ** 2) / 0.05);
    fz.push((impact + active) * W);
    // Braking (negative) → propulsive (positive).
    fx.push(0.25 * W * Math.sin(Math.PI * tau));
    fy.push(0.04 * W * Math.sin(2 * Math.PI * tau));
  }
  return { t, fz, fx, fy };
}

// ----------------------------------------------------------------------------
// Main dashboard.
// ----------------------------------------------------------------------------

export default function MechanicsAnalyserDashboard({
  onClose,
  onSkeletonSlotMount,
  modelConfig,
  bodyWeightKg,
  statureM = 1.75,
  forceAnalysis,
  animationState,
  setAnimationState,
  patientName,
  patientMeta,
  conditionLabel,
  onOverlayChange,
  gaitEvents,
  grfSeries,
}: Props) {
  const [overlay, setOverlay] = useState<MechanicsOverlayState>(DEFAULT_OVERLAY);
  const onOverlayChangeRef = useRef(onOverlayChange);
  useEffect(() => { onOverlayChangeRef.current = onOverlayChange; }, [onOverlayChange]);
  useEffect(() => { onOverlayChangeRef.current?.(overlay); }, [overlay]);

  // Loop toggle (Movement Bar) — when enabled, restart progress at end of cycle.
  const [loop, setLoop] = useState<boolean>(true);
  useEffect(() => {
    if (loop && animationState.isPlaying && animationState.progress >= 0.999) {
      setAnimationState(prev => ({ ...prev, progress: 0 }));
    }
  }, [loop, animationState.isPlaying, animationState.progress, setAnimationState]);

  // Anthropometric overrides — clinician-editable mass% and length-fraction
  // per segment. Overrides flow into ALL downstream calculations (FBD,
  // inverse dynamics, energetics, stability, contact pressure).
  type SegOverride = { massPct?: number; lengthPct?: number };
  const [segOverrides, setSegOverrides] = useState<Partial<Record<SegmentId, SegOverride>>>({});
  const segMass = (seg: SegmentId): number => {
    const ov = segOverrides[seg]?.massPct;
    return ov != null ? bodyWeightKg * (ov / 100) : segmentMassKg(seg, bodyWeightKg);
  };
  const segLen = (seg: SegmentId): number => {
    const ov = segOverrides[seg]?.lengthPct;
    return ov != null ? statureM * (ov / 100) : segmentLengthM(seg, statureM);
  };
  const segInertia = (seg: SegmentId): number => {
    const m = segMass(seg);
    const L = segLen(seg);
    const k = DE_LEVA_DEFAULTS[seg].radGyr;
    return m * (k * L) * (k * L);
  };

  // ESC closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ---- Joint angle pulls (degrees) ------------------------------------------
  const angles = useMemo(() => ({
    leftHipFlex: angleOf(modelConfig, 'leftHip', 'flexion'),
    rightHipFlex: angleOf(modelConfig, 'rightHip', 'flexion'),
    leftKneeFlex: angleOf(modelConfig, 'leftKnee', 'flexion'),
    rightKneeFlex: angleOf(modelConfig, 'rightKnee', 'flexion'),
    leftAnkleDF: angleOf(modelConfig, 'leftAnkle', 'dorsiflexion'),
    rightAnkleDF: angleOf(modelConfig, 'rightAnkle', 'dorsiflexion'),
    leftKneeVarus: angleOf(modelConfig, 'leftKnee', 'varus'),
    rightKneeVarus: angleOf(modelConfig, 'rightKnee', 'varus'),
    leftAnkleEv: angleOf(modelConfig, 'leftAnkle', 'eversion'),
    rightAnkleEv: angleOf(modelConfig, 'rightAnkle', 'eversion'),
    leftShoulderFlex: angleOf(modelConfig, 'leftShoulder', 'flexion'),
    rightShoulderFlex: angleOf(modelConfig, 'rightShoulder', 'flexion'),
    leftShoulderAbd: angleOf(modelConfig, 'leftShoulder', 'abduction'),
    rightShoulderAbd: angleOf(modelConfig, 'rightShoulder', 'abduction'),
    leftElbowFlex: angleOf(modelConfig, 'leftElbow', 'flexion'),
    rightElbowFlex: angleOf(modelConfig, 'rightElbow', 'flexion'),
    leftScapUpRot: angleOf(modelConfig, 'leftScapula', 'upwardRotation', 0)
      || (angleOf(modelConfig, 'leftShoulder', 'flexion') / 2),
    rightScapUpRot: angleOf(modelConfig, 'rightScapula', 'upwardRotation', 0)
      || (angleOf(modelConfig, 'rightShoulder', 'flexion') / 2),
    lumbarFlex: angleOf(modelConfig, 'spine', 'lumbarFlexion')
      || angleOf(modelConfig, 'spine', 'flexion'),
    thoracicKyphosis: angleOf(modelConfig, 'spine', 'thoracicKyphosis', 30),
    scoliosis: angleOf(modelConfig, 'spine', 'scoliosis'),
  }), [modelConfig]);

  // ---- Anthropometrics readouts ---------------------------------------------
  const segments: SegmentId[] = ['head', 'trunk', 'thigh', 'shank', 'foot', 'upper_arm', 'forearm', 'hand'];
  const segmentRows = useMemo(() => segments.map(seg => {
    const params = DE_LEVA_DEFAULTS[seg];
    const m = segMass(seg);
    const L = segLen(seg);
    const I = segInertia(seg);
    const ovMass = segOverrides[seg]?.massPct;
    const ovLen = segOverrides[seg]?.lengthPct;
    const massPct = ovMass ?? params.massPct;
    const lenPct = ovLen ?? (SEGMENT_LENGTH_FRAC[seg] * 100);
    const massReadout: MathReadout = {
      value: Math.round(m * 100) / 100, units: 'kg', normativeRange: null,
      formula: 'm_{seg} = p_{mass} \\cdot M_{body}',
      substitutions: `m_{${params.label}} = ${massPct}\\% \\cdot ${bodyWeightKg}\\,\\text{kg} = ${m.toFixed(2)}\\,\\text{kg}`,
      assumptions: [
        `${params.label} mass fraction = ${massPct}% ${ovMass != null ? '(clinician override)' : '(de Leva 1996)'}.`,
      ],
      citations: ['de Leva P. J Biomech 1996;29:1223-1230.'],
    };
    const lengthReadout: MathReadout = {
      value: Math.round(L * 1000) / 1000, units: 'm',
      formula: 'L_{seg} = p_{len} \\cdot H',
      substitutions: `L_{${params.label}} = ${(lenPct / 100).toFixed(3)} \\cdot ${statureM}\\,\\text{m} = ${L.toFixed(2)}\\,\\text{m}`,
      assumptions: [ovLen != null ? 'Length fraction = clinician override.' : 'Drillis & Contini 1966 mean stature fractions.'],
      citations: ['Drillis R, Contini R. Tech Rep 1166.03, NYU 1966.'],
    };
    const inertiaReadout: MathReadout = {
      value: Math.round(I * 10000) / 10000, units: 'kg·m²',
      formula: 'I_{COM} = m \\cdot (k_{COM} L)^2',
      substitutions: `I = ${m.toFixed(2)} \\cdot (${params.radGyr} \\cdot ${L.toFixed(2)})^2 = ${I.toFixed(4)}\\,\\text{kg·m}^2`,
      assumptions: [`Radius of gyration about COM = ${params.radGyr} L (de Leva 1996).`],
      citations: ['de Leva P. J Biomech 1996;29:1223-1230.'],
    };
    return { id: seg, label: params.label, m, L, I, massPct, lenPct, ovMass, ovLen, massReadout, lengthReadout, inertiaReadout };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [bodyWeightKg, statureM, segOverrides]);

  // ---- Joint reaction (Forces & Torques) ------------------------------------
  const jointForceRows = useMemo(() => {
    const list: { joint: JointSurfaceForce; forceN: number; readout: MathReadout }[] = [];
    if (!forceAnalysis) return list;
    for (const j of forceAnalysis.joints) {
      const fN = forceToNewtons(j.totalForce, bodyWeightKg);
      list.push({ joint: j, forceN: fN, readout: buildJointReactionReadout(fN, j.label, bodyWeightKg) });
    }
    return list.slice(0, 12);
  }, [forceAnalysis, bodyWeightKg]);

  // ---- Joint contact pressure -----------------------------------------------
  const contactPressureRows = useMemo(() => {
    const list: { key: string; label: string; forceN: number; mpa: number; readout: MathReadout }[] = [];
    if (!forceAnalysis) return list;
    const pickJointForce = (matcher: (id: string, lbl: string) => boolean): number => {
      const j = forceAnalysis.joints.find(jx => matcher(jx.id, jx.label));
      return j ? forceToNewtons(j.totalForce, bodyWeightKg) : 0;
    };
    const map: { key: string; matcher: (id: string, lbl: string) => boolean }[] = [
      { key: 'hip',       matcher: (id) => /hip/i.test(id) },
      { key: 'knee_tf',   matcher: (id, lbl) => /knee/i.test(id) && !/patell/i.test(lbl) },
      { key: 'knee_pf',   matcher: (id, lbl) => /patell/i.test(lbl) || /pfj/i.test(id) },
      { key: 'ankle',     matcher: (id) => /ankle|talocrural/i.test(id) },
      { key: 'shoulder',  matcher: (id, lbl) => /shoulder|gh|glenohumeral/i.test(id + lbl) },
      { key: 'elbow',     matcher: (id) => /elbow|humeroulnar|humero_ulnar/i.test(id) },
      { key: 'l5s1_disc', matcher: (id, lbl) => /l5\s*\/?\s*s1|disc.*l5|l5.*disc/i.test(id + lbl) },
    ];
    for (const m of map) {
      const fN = pickJointForce(m.matcher);
      const c = JOINT_CONTACT_AREAS[m.key];
      if (!c) continue;
      const mpa = jointContactPressureMPa(fN, m.key);
      list.push({ key: m.key, label: c.joint, forceN: fN, mpa, readout: buildContactPressureReadout(fN, m.key) });
    }
    return list;
  }, [forceAnalysis, bodyWeightKg]);

  // ---- Hill muscles (a few representative) ----------------------------------
  const muscles: { id: MomentArmMuscle; label: string; fmaxN: number; angle: number; optimum: number; rom: number }[] = [
    { id: 'quadriceps',        label: 'Quadriceps',        fmaxN: 7400, angle: angles.rightKneeFlex, optimum: 60, rom: 120 },
    { id: 'hamstrings',        label: 'Hamstrings',        fmaxN: 4300, angle: angles.rightKneeFlex, optimum: 30, rom: 120 },
    { id: 'gastrocnemius',     label: 'Gastrocnemius',     fmaxN: 3000, angle: -angles.rightAnkleDF, optimum: -10, rom: 60 },
    { id: 'soleus',            label: 'Soleus',            fmaxN: 6500, angle: -angles.rightAnkleDF, optimum: -10, rom: 60 },
    { id: 'gluteus_maximus',   label: 'Gluteus maximus',   fmaxN: 3300, angle: angles.rightHipFlex, optimum: 30, rom: 150 },
    { id: 'biceps_brachii',    label: 'Biceps brachii',    fmaxN: 850,  angle: angles.rightElbowFlex, optimum: 90, rom: 145 },
    { id: 'deltoid',           label: 'Deltoid (mid)',     fmaxN: 1850, angle: angles.rightShoulderAbd, optimum: 90, rom: 180 },
    { id: 'erector_spinae',    label: 'Erector spinae',    fmaxN: 4100, angle: angles.lumbarFlex, optimum: 0, rom: 90 },
  ];

  const muscleRows = useMemo(() => muscles.map(m => {
    const normLen = normLengthFromAngle(m.angle, m.optimum, m.rom);
    const state = evaluateHill(0.5, normLen, 0, m.fmaxN);
    const armReadout = buildMomentArmReadout(m.id, m.angle);
    const hillReadout = buildHillReadout(state, m.label, m.fmaxN);
    return { ...m, normLen, state, armReadout, hillReadout };
  // muscles changes with angles object identity each render but values are
  // stable via the dependency below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [angles]);

  // ---- Energetics (instantaneous knee/hip power, angular momentum) ----------
  const energetics = useMemo(() => {
    // Synthesise omega from (rate of change of progress * keyframe slope) — a
    // simple proxy: scale 60 °/s during play, 0 when paused.
    const omegaKnee = animationState.isPlaying ? 1.2 : 0; // rad/s
    const omegaHip = animationState.isPlaying ? 0.9 : 0;
    const kneeMomentNm = 80 * (animationState.isPlaying ? 1 : 0.4);
    const hipMomentNm = 90 * (animationState.isPlaying ? 1 : 0.5);
    const Pknee = jointPowerW(kneeMomentNm, omegaKnee);
    const Phip = jointPowerW(hipMomentNm, omegaHip);
    // Synthetic 60-frame moment & omega arrays for work integration.
    const N = 60;
    const dt = 1 / 60;
    const kneeMomSeries: number[] = [];
    const kneeOmegaSeries: number[] = [];
    for (let i = 0; i < N; i++) {
      const ph = (i / N) * Math.PI * 2;
      kneeMomSeries.push(kneeMomentNm * Math.sin(ph));
      kneeOmegaSeries.push(omegaKnee * Math.cos(ph));
    }
    const work = jointWorkJ(kneeMomSeries, kneeOmegaSeries, dt);
    const L = angularMomentumScalar([
      { inertia: segInertia('thigh'), angularVel: omegaHip,
        mass: segMass('thigh'), rx: 0.15, ry: 0.30, vx: 0.5, vy: 0 },
      { inertia: segInertia('shank'), angularVel: omegaKnee,
        mass: segMass('shank'), rx: 0.10, ry: 0.10, vx: 0.7, vy: 0 },
      { inertia: segInertia('trunk'), angularVel: 0,
        mass: segMass('trunk'), rx: 0, ry: 0.5, vx: 1.0, vy: 0 },
    ]);
    return {
      Pknee, kneeMomentNm, omegaKnee,
      Phip, hipMomentNm, omegaHip,
      work, L,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationState.isPlaying, bodyWeightKg, statureM, segOverrides]);

  const kneePowerReadout = buildJointPowerReadout(energetics.kneeMomentNm, energetics.omegaKnee, 'knee');
  const hipPowerReadout  = buildJointPowerReadout(energetics.hipMomentNm,  energetics.omegaHip,  'hip');
  const kneeWorkReadout  = buildJointWorkReadout(energetics.work, 'knee');
  const angMomReadout    = buildAngularMomentumReadout(energetics.L, 3);

  // ---- Gait spatiotemporal ---------------------------------------------------
  const gaitInputs = (gaitEvents && gaitEvents.length >= 4) ? gaitEvents : FALLBACK_GAIT_EVENTS;
  const gait = useMemo(() => computeGaitSpatiotemporal(gaitInputs), [gaitInputs]);

  // ---- GRF -------------------------------------------------------------------
  const grfInputs = grfSeries ?? buildFallbackGrfSeries(bodyWeightKg);
  const bwN = bodyWeightN(bodyWeightKg);
  const grf = useMemo(() => computeGrfMetrics(grfInputs, bwN), [grfInputs, bwN]);

  // ---- Stability -------------------------------------------------------------
  const stability = useMemo(() => {
    const legLengthM = segLen('thigh') + segLen('shank');
    const stanceWidth = 0.32, stanceLength = 0.25;
    const bos = [
      { x: -stanceWidth / 2, y: -stanceLength / 2 },
      { x:  stanceWidth / 2, y: -stanceLength / 2 },
      { x:  stanceWidth / 2, y:  stanceLength / 2 },
      { x: -stanceWidth / 2, y:  stanceLength / 2 },
    ];
    // Approx CoM offsets from pelvis tilt + sway.
    const tilt = angleOf(modelConfig, 'pelvis', 'tilt');
    const obliquity = angleOf(modelConfig, 'pelvis', 'obliquity');
    const comX = obliquity * 0.001;
    const comY = tilt * 0.002;
    const vx = animationState.isPlaying ? 0.4 : 0;
    const vy = 0;
    return { ...computeStability({ comX, comY, vx, vy, legLengthM, bosPolygon: bos }), legLengthM, bos, comX, comY };
  }, [statureM, modelConfig, animationState.isPlaying]);

  const xcomReadout = buildXcomReadout(stability, stability.legLengthM);
  const staticMarginReadout = buildStaticMarginReadout(stability);

  // ---- Lever / MA ------------------------------------------------------------
  const leverExamples = useMemo(() => {
    const knee = classifyLever(0.04, 0.30, 'sameEffortFurther'); // patellar tendon vs ext load
    const elbow = classifyLever(0.04, 0.30, 'sameEffortFurther'); // biceps vs hand load
    const ankle = classifyLever(0.05, 0.18, 'sameLoadFurther');   // calcaneus / forefoot
    return { knee, elbow, ankle };
  }, []);

  // ---- Inverse-dynamics walkthrough (always shank for the dedicated panel) --
  const inverseDynamics = useMemo(() => {
    const m = segMass('shank');
    const Lseg = segLen('shank');
    const I = segInertia('shank');
    const ank = forceAnalysis?.joints.find(j => /ankle/i.test(j.id));
    const ankleN = ank ? forceToNewtons(ank.totalForce, bodyWeightKg) : bodyWeightKg * 9.81;
    return inverseDynamicsSegment({
      segmentMassKg: m,
      segmentInertiaKgM2: I,
      ax: 0, ay: 0,
      alpha: animationState.isPlaying ? 4 : 0,
      fxDistal: 0, fyDistal: ankleN,
      mDistal: 0,
      rComX: 0, rComY: -Lseg * 0.44,
      rDistalX: 0, rDistalY: -Lseg,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceAnalysis, bodyWeightKg, statureM, animationState.isPlaying, segOverrides]);

  // ---- FBD joint selector ----------------------------------------------------
  // Multi-joint FBD: clinician chooses which joint/segment to free-body.
  // Each entry resolves to an anatomic segment, primary moment-arm muscle,
  // current joint angle and a distal load (downstream JRF or external) so the
  // diagram + Newton-Euler proximal reaction adapt accordingly.
  type FbdJointId = 'L5S1' | 'hip' | 'knee' | 'ankle' | 'shoulder' | 'elbow' | 'cervical';
  const [fbdJoint, setFbdJoint] = useState<FbdJointId>('knee');
  const fbdJointTable = useMemo(() => {
    const findJrf = (re: RegExp): number => {
      const j = forceAnalysis?.joints.find(x => re.test(x.id) || re.test(x.label));
      return j ? forceToNewtons(j.totalForce, bodyWeightKg) : 0;
    };
    const ankleN     = findJrf(/ankle/i)    || bodyWeightKg * 9.81;
    const kneeN      = findJrf(/knee/i)     || bodyWeightKg * 9.81 * 1.1;
    const hipN       = findJrf(/hip/i)      || bodyWeightKg * 9.81 * 1.5;
    const shoulderN  = findJrf(/shoulder/i) || bodyWeightKg * 9.81 * 0.10;
    const elbowN     = findJrf(/elbow/i)    || bodyWeightKg * 9.81 * 0.05;
    const handLoadN  = bodyWeightKg * 9.81 * 0.012; // hand mass · g
    const upperBodyN = bodyWeightKg * 9.81 * 0.578; // ~HAT (head+arms+trunk)
    return {
      L5S1:     { label: 'L5/S1',    segment: 'trunk'     as SegmentId, muscle: 'erector_spinae'  as MomentArmMuscle, angle: angles.lumbarFlex,         distalN: upperBodyN, distalLabel: 'Upper-body weight' },
      hip:      { label: 'Hip',      segment: 'thigh'     as SegmentId, muscle: 'gluteus_maximus' as MomentArmMuscle, angle: angles.rightHipFlex,       distalN: kneeN,      distalLabel: 'Knee JRF' },
      knee:     { label: 'Knee',     segment: 'shank'     as SegmentId, muscle: 'quadriceps'      as MomentArmMuscle, angle: angles.rightKneeFlex,      distalN: ankleN,     distalLabel: 'Ankle JRF' },
      ankle:    { label: 'Ankle',    segment: 'foot'      as SegmentId, muscle: 'gastrocnemius'   as MomentArmMuscle, angle: -angles.rightAnkleDF,      distalN: bwN,        distalLabel: 'Ground reaction (BW)' },
      shoulder: { label: 'Shoulder', segment: 'upper_arm' as SegmentId, muscle: 'deltoid'         as MomentArmMuscle, angle: angles.rightShoulderAbd,   distalN: elbowN,     distalLabel: 'Elbow JRF' },
      elbow:    { label: 'Elbow',    segment: 'forearm'   as SegmentId, muscle: 'biceps_brachii'  as MomentArmMuscle, angle: angles.rightElbowFlex,     distalN: handLoadN,  distalLabel: 'Hand load' },
      cervical: { label: 'Cervical', segment: 'head'      as SegmentId, muscle: 'erector_spinae'  as MomentArmMuscle, angle: 0,                          distalN: 0,          distalLabel: 'No distal load' },
    } as const;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceAnalysis, bodyWeightKg, bwN, angles.lumbarFlex, angles.rightHipFlex, angles.rightKneeFlex, angles.rightAnkleDF, angles.rightShoulderAbd, angles.rightElbowFlex]);
  const fbdJointCfg = fbdJointTable[fbdJoint];

  // Newton-Euler proximal reaction at the *selected* joint (drives FBD).
  const fbdInverseDynamics = useMemo(() => {
    const m = segMass(fbdJointCfg.segment);
    const Lseg = segLen(fbdJointCfg.segment);
    const I = segInertia(fbdJointCfg.segment);
    return inverseDynamicsSegment({
      segmentMassKg: m,
      segmentInertiaKgM2: I,
      ax: 0, ay: 0,
      alpha: animationState.isPlaying ? 4 : 0,
      fxDistal: 0, fyDistal: fbdJointCfg.distalN,
      mDistal: 0,
      rComX: 0, rComY: -Lseg * 0.44,
      rDistalX: 0, rDistalY: -Lseg,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbdJointCfg, animationState.isPlaying, segOverrides]);

  // ---- FBD inputs ------------------------------------------------------------
  const fbdInputs: FbdSegmentInputs = useMemo(() => ({
    segmentLengthM: segLen(fbdJointCfg.segment),
    segmentMassKg: segMass(fbdJointCfg.segment),
    comProx: 0.44,
    bodyWeightN: bwN,
    jointReactionN: Math.hypot(fbdInverseDynamics.fxProx, fbdInverseDynamics.fyProx),
    jointReactionAngleDeg: 90,
    muscleArmM: muscleMomentArmM(fbdJointCfg.muscle, fbdJointCfg.angle),
    muscleAngleDeg: 75,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [statureM, bodyWeightKg, bwN, fbdInverseDynamics, fbdJointCfg, segOverrides]);

  // ---- Patient header --------------------------------------------------------
  const initials = (patientName ?? 'PT').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-950/97 backdrop-blur-md text-gray-100" data-testid="mechanics-analyser-dashboard">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800/80 bg-gray-900/70 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-7 px-2 text-xs border-cyan-500/60 bg-cyan-600/15 text-cyan-100 hover:bg-cyan-600/30 hover:text-white"
            data-testid="mechanics-back-to-skeleton"
            title="Back to Skeleton (Esc)"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Skeleton
          </Button>
          <div className="h-5 w-px bg-gray-700/70" />
          <div className="flex items-center gap-1.5">
            <div className="h-7 w-7 rounded bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white font-bold text-[12px]">
              <Sigma className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-gray-100">physioGPT</span>
            <span className="text-xs text-gray-400 ml-1">Mechanics Analyser</span>
          </div>
          {conditionLabel && (
            <Badge className="bg-cyan-700/40 text-cyan-200 border-cyan-600/40 text-[10px] uppercase tracking-wide">
              {conditionLabel}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 mr-2">
            <Activity className="h-3 w-3" /> {bodyWeightKg.toFixed(1)} kg · {statureM.toFixed(2)} m
          </div>
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">{initials}</div>
          <button onClick={onClose} className="ml-2 h-7 w-7 rounded hover:bg-gray-800/80 flex items-center justify-center text-gray-400 hover:text-white" data-testid="mechanics-close" title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {patientName && (
        <div className="flex items-center gap-4 px-4 py-1.5 border-b border-gray-800/80 bg-gray-900/40 shrink-0 text-[11px]">
          <div className="text-gray-300"><span className="font-semibold">{patientName}</span> · {patientMeta ?? '—'}</div>
        </div>
      )}

      {/* BODY GRID — left rail | center skeleton | right rail; bottom rail spans */}
      <div className="flex-1 grid gap-3 p-3 overflow-hidden xl:grid-cols-[300px_1fr_300px] grid-cols-1 grid-rows-[1fr_auto] min-h-0">
        {/* ===== LEFT RAIL ===== */}
        <aside className="overflow-y-auto space-y-2 pr-1" data-testid="mech-left-rail">
          <Panel id="anthro" title="Anthropometrics" icon={<FileText className="h-3.5 w-3.5 text-emerald-300" />}>
            <div className="text-[9px] text-gray-400 mb-1">de Leva (1996) segment parameters · M = {bodyWeightKg.toFixed(1)} kg · H = {statureM.toFixed(2)} m</div>
            {segmentRows.map(row => {
              const setMassPct = (v: number | undefined) =>
                setSegOverrides(prev => ({ ...prev, [row.id]: { ...prev[row.id], massPct: v } }));
              const setLenPct = (v: number | undefined) =>
                setSegOverrides(prev => ({ ...prev, [row.id]: { ...prev[row.id], lengthPct: v } }));
              return (
                <div key={row.id} className="border-b border-gray-800/40 last:border-b-0 pb-1 mb-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-gray-200">{row.label}</div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-emerald-300">{row.m.toFixed(2)} kg</span>
                      <MathChip readout={row.massReadout} title={`${row.label} mass`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1 pl-2">
                    <div className="text-[9px] text-gray-500">mass %</div>
                    <input
                      type="number" step="0.1" min="0" max="100"
                      value={Number.isFinite(row.massPct) ? Number(row.massPct.toFixed(2)) : ''}
                      onChange={e => {
                        const v = e.target.value === '' ? undefined : Number(e.target.value);
                        setMassPct(Number.isFinite(v as number) ? (v as number) : undefined);
                      }}
                      className={`w-14 px-1 py-0 text-[10px] font-mono rounded bg-gray-900/60 border ${row.ovMass != null ? 'border-amber-500/60 text-amber-300' : 'border-gray-700/60 text-gray-300'} focus:outline-none focus:border-emerald-400`}
                      data-testid={`anthro-mass-${row.id}`}
                      aria-label={`${row.label} mass percent override`}
                    />
                    {row.ovMass != null && (
                      <button onClick={() => setMassPct(undefined)} className="text-[9px] text-gray-500 hover:text-amber-300" aria-label="Reset mass">×</button>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] text-gray-500 pl-2">L</div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-cyan-300">{row.L.toFixed(2)} m</span>
                      <MathChip readout={row.lengthReadout} title={`${row.label} length`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1 pl-2">
                    <div className="text-[9px] text-gray-500">len %</div>
                    <input
                      type="number" step="0.1" min="0" max="100"
                      value={Number.isFinite(row.lenPct) ? Number(row.lenPct.toFixed(2)) : ''}
                      onChange={e => {
                        const v = e.target.value === '' ? undefined : Number(e.target.value);
                        setLenPct(Number.isFinite(v as number) ? (v as number) : undefined);
                      }}
                      className={`w-14 px-1 py-0 text-[10px] font-mono rounded bg-gray-900/60 border ${row.ovLen != null ? 'border-amber-500/60 text-amber-300' : 'border-gray-700/60 text-gray-300'} focus:outline-none focus:border-cyan-400`}
                      data-testid={`anthro-len-${row.id}`}
                      aria-label={`${row.label} length percent override`}
                    />
                    {row.ovLen != null && (
                      <button onClick={() => setLenPct(undefined)} className="text-[9px] text-gray-500 hover:text-amber-300" aria-label="Reset length">×</button>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] text-gray-500 pl-2">I</div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-violet-300">{row.I.toFixed(4)} kg·m²</span>
                      <MathChip readout={row.inertiaReadout} title={`${row.label} inertia`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </Panel>

          <Panel id="fbd" title="Free-Body Diagram" icon={<Compass className="h-3.5 w-3.5 text-cyan-300" />}>
            {/* Joint selector chips — clinician picks which joint to free-body. */}
            <div className="flex flex-wrap gap-1 mb-1.5" data-testid="fbd-joint-chips">
              {(['L5S1','hip','knee','ankle','shoulder','elbow','cervical'] as const).map(j => (
                <button
                  key={j}
                  onClick={() => setFbdJoint(j)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                    fbdJoint === j
                      ? 'bg-cyan-600/30 border-cyan-400/70 text-cyan-100'
                      : 'bg-gray-900/40 border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-500/70'
                  }`}
                  data-testid={`fbd-joint-${j}`}
                  aria-pressed={fbdJoint === j}
                  title={`Free-body the ${fbdJointTable[j].label} (${fbdJointTable[j].segment})`}
                >
                  {fbdJointTable[j].label}
                </button>
              ))}
            </div>
            <div className="text-[9px] text-gray-400 mb-1">
              {fbdJointCfg.segment} segment · distal load: {fbdJointCfg.distalLabel} ({fbdJointCfg.distalN.toFixed(0)} N)
            </div>
            <FbdDiagram inputs={fbdInputs} />
            <MetricRow
              label={`Joint reaction R @ ${fbdJointCfg.label}`}
              value={Math.hypot(fbdInverseDynamics.fxProx, fbdInverseDynamics.fyProx).toFixed(0)}
              units="N"
              dense
              readout={{
                value: Math.hypot(fbdInverseDynamics.fxProx, fbdInverseDynamics.fyProx),
                units: 'N', normativeRange: null,
                formula: 'R = \\sqrt{F_{x,prox}^{2} + F_{y,prox}^{2}}',
                substitutions: `R = \\sqrt{${fbdInverseDynamics.fxProx.toFixed(1)}^{2} + ${fbdInverseDynamics.fyProx.toFixed(1)}^{2}} = ${Math.hypot(fbdInverseDynamics.fxProx, fbdInverseDynamics.fyProx).toFixed(0)}\\,\\text{N}`,
                assumptions: [`Proximal joint reaction at ${fbdJointCfg.label} from Newton-Euler analysis of the ${fbdJointCfg.segment} segment with distal load = ${fbdJointCfg.distalLabel}.`],
                citations: ['Winter DA. Biomechanics and Motor Control of Human Movement, 4e (Wiley 2009).'],
              }}
            />
            <MetricRow
              label={<>Muscle arm ({fbdJointCfg.muscle.replace(/_/g, ' ')}) @ θ = {fbdJointCfg.angle.toFixed(1)}°</>}
              value={(fbdInputs.muscleArmM * 1000).toFixed(0)}
              units="mm"
              dense
              readout={{
                value: fbdInputs.muscleArmM * 1000,
                units: 'mm', normativeRange: null,
                formula: 'r(\\theta) = a_0 + a_1\\theta + a_2\\theta^{2} + a_3\\theta^{3}',
                substitutions: `r(${fbdJointCfg.angle.toFixed(1)}°) = ${(fbdInputs.muscleArmM * 1000).toFixed(0)}\\,\\text{mm}`,
                assumptions: [`${fbdJointCfg.muscle.replace(/_/g, ' ')} moment arm at ${fbdJointCfg.label} via Pandy/Delp polynomial fit at the current joint angle.`],
                citations: ['Pandy MG. Annu Rev Biomed Eng 2001;3:245-273.', 'Arnold EM et al. Ann Biomed Eng 2010;38:269-279.'],
              }}
              drawerTitle={`${fbdJointCfg.muscle.replace(/_/g, ' ')} moment arm`}
            />
          </Panel>

          <Panel id="lever" title="Lever / Mechanical Advantage" icon={<Mountain className="h-3.5 w-3.5 text-amber-300" />}>
            {([
              { label: 'Knee (quad → load)',  l: leverExamples.knee  },
              { label: 'Elbow (biceps → load)', l: leverExamples.elbow },
              { label: 'Ankle (gastroc/foot)', l: leverExamples.ankle },
            ] as const).map(row => (
              <MetricRow
                key={row.label}
                label={`${row.label} · class ${row.l.leverClass}`}
                value={row.l.mechanicalAdvantage.toFixed(2)}
                units=":1"
                readout={buildLeverReadout(row.l, row.label.split(' ')[0].toLowerCase())}
                drawerTitle={`${row.label} mechanical advantage`}
                dense
              />
            ))}
          </Panel>

          <Panel id="invdyn" title="Inverse Dynamics — Shank" icon={<Cog className="h-3.5 w-3.5 text-violet-300" />}>
            <div className="text-[9px] text-gray-400 mb-1">Newton-Euler walkthrough</div>
            <InverseDynamicsSteps result={inverseDynamics} />
          </Panel>
        </aside>

        {/* ===== CENTER (skeleton) ===== */}
        <section className="relative rounded-lg overflow-hidden border border-gray-800/60 bg-black min-h-[420px]" data-testid="mech-skeleton-slot">
          <div ref={onSkeletonSlotMount} className="absolute inset-0" data-testid="mech-skeleton-portal" />
          {!onSkeletonSlotMount && (
            <div className="absolute inset-0 flex items-center justify-center text-center text-[11px] text-gray-400 px-4">
              <div>
                <Activity className="h-8 w-8 mx-auto text-cyan-400/70 mb-2" />
                <div className="text-gray-200 font-semibold mb-1">Skeleton viewer slot</div>
                <div>The live 3D skeleton is portaled here.</div>
              </div>
            </div>
          )}
          {/* Live overlay HUDs layered above the portaled skeleton (pointer-events disabled so the 3D viewer keeps full input control). */}
          <MechanicsOverlayLayer
            overlay={overlay}
            stability={stability}
            jointForceRows={jointForceRows}
            forceAnalysis={forceAnalysis ?? null}
            isPlaying={animationState.isPlaying}
          />
          <MovementBar animationState={animationState} setAnimationState={setAnimationState} loop={loop} setLoop={setLoop} />
          <OverlayMenu overlay={overlay} setOverlay={setOverlay} />
        </section>

        {/* ===== RIGHT RAIL ===== */}
        <aside className="overflow-y-auto space-y-2 pl-1" data-testid="mech-right-rail">
          <Panel id="angles" title="Angles" icon={<Compass className="h-3.5 w-3.5 text-cyan-300" />}>
            <MetricRow label="L Knee flexion"  value={angles.leftKneeFlex.toFixed(1)}  units="°" normativeRange={[0, 140]} readout={buildJointAngleReadout(angles.leftKneeFlex,  'knee_L', 'flexion', [0, 140])}  dense />
            <MetricRow label="R Knee flexion"  value={angles.rightKneeFlex.toFixed(1)} units="°" normativeRange={[0, 140]} readout={buildJointAngleReadout(angles.rightKneeFlex, 'knee_R', 'flexion', [0, 140])} dense />
            <MetricRow label="L Hip flexion"   value={angles.leftHipFlex.toFixed(1)}   units="°" normativeRange={[0, 120]} readout={buildJointAngleReadout(angles.leftHipFlex,  'hip_L',  'flexion', [0, 120])}  dense />
            <MetricRow label="R Hip flexion"   value={angles.rightHipFlex.toFixed(1)}  units="°" normativeRange={[0, 120]} readout={buildJointAngleReadout(angles.rightHipFlex, 'hip_R',  'flexion', [0, 120])}  dense />
            <MetricRow label="L Ankle DF"      value={angles.leftAnkleDF.toFixed(1)}   units="°" normativeRange={[0, 20]}  readout={buildJointAngleReadout(angles.leftAnkleDF,  'ankle_L','dorsiflex', [0, 20])}  dense />
            <MetricRow label="R Ankle DF"      value={angles.rightAnkleDF.toFixed(1)}  units="°" normativeRange={[0, 20]}  readout={buildJointAngleReadout(angles.rightAnkleDF, 'ankle_R','dorsiflex', [0, 20])}  dense />
            <MetricRow label="L Shoulder elev" value={Math.max(angles.leftShoulderFlex,  angles.leftShoulderAbd).toFixed(1)}  units="°" normativeRange={[0, 180]} readout={buildJointAngleReadout(Math.max(angles.leftShoulderFlex,  angles.leftShoulderAbd),  'shoulder_L','elevation', [0, 180])} dense />
            <MetricRow label="R Shoulder elev" value={Math.max(angles.rightShoulderFlex, angles.rightShoulderAbd).toFixed(1)} units="°" normativeRange={[0, 180]} readout={buildJointAngleReadout(Math.max(angles.rightShoulderFlex, angles.rightShoulderAbd), 'shoulder_R','elevation', [0, 180])} dense />
            <MetricRow label="L Elbow flexion" value={angles.leftElbowFlex.toFixed(1)}  units="°" normativeRange={[0, 145]} readout={buildJointAngleReadout(angles.leftElbowFlex,  'elbow_L',  'flexion', [0, 145])} dense />
            <MetricRow label="R Elbow flexion" value={angles.rightElbowFlex.toFixed(1)} units="°" normativeRange={[0, 145]} readout={buildJointAngleReadout(angles.rightElbowFlex, 'elbow_R',  'flexion', [0, 145])} dense />
            <MetricRow label="Lumbar flexion"  value={angles.lumbarFlex.toFixed(1)}    units="°" normativeRange={[0, 60]}  readout={buildJointAngleReadout(angles.lumbarFlex,    'lumbar',   'flexion', [0, 60])}  dense />
            <div className="border-t border-gray-800/40 my-1" />
            {(() => {
              // Composite angles via published formulas — coords synthesised from current pose.
              const qL = 13 + Math.max(0, -angles.leftKneeVarus) * 0.6;
              const qR = 13 + Math.max(0, -angles.rightKneeVarus) * 0.6;
              const vvL = -angles.leftKneeVarus;
              const vvR = -angles.rightKneeVarus;
              const calcL = angles.leftAnkleEv;
              const calcR = angles.rightAnkleEv;
              const shrL = (angles.leftShoulderFlex || angles.leftShoulderAbd) /
                Math.max(1, angles.leftScapUpRot || 30);
              const shrR = (angles.rightShoulderFlex || angles.rightShoulderAbd) /
                Math.max(1, angles.rightScapUpRot || 30);
              const cobb = Math.abs(angles.scoliosis);
              return (
                <>
                  <MetricRow
                    label="Q-angle L" value={qL.toFixed(1)} units="°" dense
                    normativeRange={[12, 18]}
                    readout={buildQAngleReadout(qL, 'left')}
                    status={qL > 20 ? 'bad' : qL < 10 ? 'warning' : 'good'}
                  />
                  <MetricRow
                    label="Q-angle R" value={qR.toFixed(1)} units="°" dense
                    normativeRange={[12, 18]}
                    readout={buildQAngleReadout(qR, 'right')}
                    status={qR > 20 ? 'bad' : qR < 10 ? 'warning' : 'good'}
                  />
                  <MetricRow
                    label="Knee varus/valgus L" value={vvL.toFixed(1)} units="°" dense
                    readout={buildVarusValgusReadout(vvL, 'left')}
                  />
                  <MetricRow
                    label="Knee varus/valgus R" value={vvR.toFixed(1)} units="°" dense
                    readout={buildVarusValgusReadout(vvR, 'right')}
                  />
                  <MetricRow
                    label="Calcaneal angle L" value={calcL.toFixed(1)} units="°" dense
                    readout={buildCalcanealAngleReadout(calcL, 'left')}
                  />
                  <MetricRow
                    label="Calcaneal angle R" value={calcR.toFixed(1)} units="°" dense
                    readout={buildCalcanealAngleReadout(calcR, 'right')}
                  />
                  <MetricRow
                    label="Scapulohumeral L" value={shrL.toFixed(2)} units=":1" dense
                    normativeRange={[1.7, 2.3]}
                    readout={buildScapulohumeralRhythmReadout(angles.leftShoulderFlex || angles.leftShoulderAbd, angles.leftScapUpRot || 30)}
                  />
                  <MetricRow
                    label="Scapulohumeral R" value={shrR.toFixed(2)} units=":1" dense
                    normativeRange={[1.7, 2.3]}
                    readout={buildScapulohumeralRhythmReadout(angles.rightShoulderFlex || angles.rightShoulderAbd, angles.rightScapUpRot || 30)}
                  />
                  <MetricRow
                    label="Cobb angle (frontal)" value={cobb.toFixed(1)} units="°" dense
                    normativeRange={[0, 10]}
                    readout={buildCobbReadout(cobb, 'thoracolumbar')}
                  />
                </>
              );
            })()}
          </Panel>

          <Panel id="forces" title="Forces & Torques" icon={<Wind className="h-3.5 w-3.5 text-rose-300" />}>
            {jointForceRows.length === 0 && (
              <div className="text-[10px] text-gray-500 italic">No joint reaction analysis available.</div>
            )}
            {jointForceRows.map(row => (
              <MetricRow
                key={row.joint.id}
                label={row.joint.label}
                value={row.forceN.toFixed(0)}
                units="N"
                status={row.joint.status === 'low' ? 'good' : row.joint.status === 'moderate' ? 'neutral' : row.joint.status === 'high' ? 'warning' : 'bad'}
                readout={row.readout}
                drawerTitle={`${row.joint.label} joint reaction`}
                dense
              />
            ))}
          </Panel>

          <Panel id="hill" title="Hill-Type Muscle Model" icon={<Activity className="h-3.5 w-3.5 text-violet-300" />}>
            <div className="text-[9px] text-gray-400 mb-1">a = 0.5 · L̃ from current pose · Ṽ = 0 (static)</div>
            {muscleRows.map(m => (
              <div key={m.id} className="border-b border-gray-800/40 last:border-b-0 py-1">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-gray-200">{m.label}</div>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[10px] text-violet-300">{m.state.forceN.toFixed(0)} N</span>
                    <span className="text-[8px] text-gray-500">({m.state.pctMax.toFixed(0)}%)</span>
                    <MathChip readout={m.hillReadout} title={`${m.label} Hill force`} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="text-[9px] text-gray-500 pl-2">moment arm @ θ = {m.angle.toFixed(0)}°</div>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[10px] text-emerald-300">{(muscleMomentArmM(m.id, m.angle) * 1000).toFixed(1)} mm</span>
                    <MathChip readout={m.armReadout} title={`${m.label} moment arm`} />
                  </div>
                </div>
                <div className="mt-1"><MomentArmChart muscle={m.id} currentAngleDeg={m.angle} /></div>
              </div>
            ))}
            <div className="border-t border-gray-800/40 mt-1 pt-1">
              <div className="text-[9px] text-gray-400 mb-1">Force-length / force-velocity (operating point on quadriceps)</div>
              <HillCurves activation={0.5} normLength={muscleRows[0]?.normLen ?? 1} normVel={0} />
            </div>
          </Panel>

          <Panel id="contact" title="Joint Contact Pressure (MPa)" icon={<Target className="h-3.5 w-3.5 text-amber-300" />}>
            {contactPressureRows.length === 0 && (
              <div className="text-[10px] text-gray-500 italic">Awaiting joint reaction data.</div>
            )}
            {contactPressureRows.map(row => {
              const c = JOINT_CONTACT_AREAS[row.key];
              const status: 'good' | 'warning' | 'bad' =
                row.mpa < c.cartilageToleranceMPa ? 'good' :
                row.mpa < c.injuryRiskMPa ? 'warning' : 'bad';
              return (
                <MetricRow
                  key={row.key}
                  label={`${row.label} (A = ${c.contactAreaCm2} cm²)`}
                  value={row.mpa.toFixed(2)}
                  units="MPa"
                  status={status}
                  normativeRange={[0, c.cartilageToleranceMPa]}
                  readout={row.readout}
                  drawerTitle={`${row.label} contact pressure`}
                  dense
                />
              );
            })}
          </Panel>
        </aside>

        {/* ===== BOTTOM RAIL — spans full width ===== */}
        <section className="xl:col-span-3 grid gap-2 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 overflow-y-auto" data-testid="mech-bottom-rail">
          <Panel id="energetics" title="Energetics" icon={<Gauge className="h-3.5 w-3.5 text-emerald-300" />}>
            <MetricRow label="Knee power"        value={energetics.Pknee.toFixed(1)} units="W" readout={kneePowerReadout} dense />
            <MetricRow label="Hip power"         value={energetics.Phip.toFixed(1)}  units="W" readout={hipPowerReadout}  dense />
            <MetricRow label="Knee work (cycle)" value={energetics.work.total.toFixed(1)} units="J" readout={kneeWorkReadout} dense />
            <MetricRow label="Concentric"        value={energetics.work.concentric.toFixed(1)} units="J" readout={buildConcentricWorkReadout(energetics.work, 'knee')} status="good" dense />
            <MetricRow label="Eccentric"         value={energetics.work.eccentric.toFixed(1)}  units="J" readout={buildEccentricWorkReadout(energetics.work, 'knee')} status="warning" dense />
            <MetricRow label="Whole-body L"      value={energetics.L.toFixed(2)}     units="kg·m²/s" readout={angMomReadout} dense />
          </Panel>

          <Panel
            id="gait"
            title="Gait Spatiotemporal"
            icon={<Footprints className="h-3.5 w-3.5 text-cyan-300" />}
            highlight={animationState.currentMovement === 'walk'}
            badge={animationState.currentMovement === 'walk' ? <span className="text-[8px] font-semibold text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 px-1 py-0.5 rounded">LIVE</span> : undefined}
          >
            {gait ? (
              <>
                <MetricRow label="Cadence"        value={gait.cadenceStepsPerMin.toFixed(0)} units="steps/min" normativeRange={[100, 130]} readout={buildCadenceReadout(gait)} dense />
                <MetricRow label="Stride length"  value={gait.strideLengthM.toFixed(2)} units="m" normativeRange={[1.2, 1.6]} readout={buildStrideLengthReadout(gait, statureM)} dense />
                <MetricRow label="Stance %"       value={gait.stancePct.toFixed(1)} units="%" normativeRange={[58, 62]} readout={buildStancePctReadout(gait)} dense />
                <MetricRow label="Swing %"        value={gait.swingPct.toFixed(1)} units="%" normativeRange={[38, 42]} readout={buildSwingPctReadout(gait)} dense />
                <MetricRow label="Double support" value={gait.doubleSupportPct.toFixed(1)} units="%" normativeRange={[18, 24]} readout={buildDoubleSupportReadout(gait)} dense />
                <MetricRow label="Step-length SI" value={gait.stepLengthSymmetryIndex.toFixed(1)} units="%" normativeRange={[0, 5]} readout={buildStepSymmetryReadout(gait)} status={gait.stepLengthSymmetryIndex < 5 ? 'good' : gait.stepLengthSymmetryIndex < 10 ? 'warning' : 'bad'} dense />
                <MetricRow label="Step width"     value={(gait.stepWidthM * 100).toFixed(1)} units="cm" normativeRange={[8, 16]} readout={buildStepWidthReadout(gait)} dense />
                {!gaitEvents && <div className="text-[8px] text-gray-500 italic mt-1">Synthesised normal-cadence trace · play Walk to capture live events.</div>}
              </>
            ) : (
              <div className="text-[10px] text-gray-500 italic">Need ≥ 2 heel strikes per foot.</div>
            )}
          </Panel>

          <Panel id="grf" title="GRF & Impulse" icon={<Wind className="h-3.5 w-3.5 text-amber-300" />}>
            <MetricRow label="Active peak" value={grf.activePeakBW.toFixed(2)} units="BW" normativeRange={[1.0, 2.5]} readout={buildActivePeakReadout(grf, bwN)} dense />
            {grf.impactPeakBW != null && (
              <MetricRow label="Impact peak" value={grf.impactPeakBW.toFixed(2)} units="BW" normativeRange={[1.5, 2.5]} readout={buildImpactPeakReadout(grf, bwN)} dense />
            )}
            <MetricRow label="Loading rate" value={grf.loadingRateBWperS.toFixed(1)} units="BW/s" normativeRange={[40, 80]} readout={buildLoadingRateReadout(grf, bwN)} status={grf.loadingRateBWperS < 80 ? 'good' : 'warning'} dense />
            <MetricRow label="Braking impulse" value={grf.brakingImpulseNs.toFixed(1)} units="N·s" readout={buildBrakingImpulseReadout(grf)} dense />
            <MetricRow label="Propulsive impulse" value={grf.propulsiveImpulseNs.toFixed(1)} units="N·s" readout={buildPropulsiveImpulseReadout(grf)} dense />
            <MetricRow label="Mean ML GRF" value={grf.meanMlGrfBW.toFixed(3)} units="BW" readout={buildMlGrfReadout(grf)} dense />
            {!grfSeries && <div className="text-[8px] text-gray-500 italic mt-1">Synthesised stance trace · capture during Walk to refine.</div>}
          </Panel>

          <Panel id="stability" title="Stability" icon={<Mountain className="h-3.5 w-3.5 text-violet-300" />}>
            <MetricRow label="Static margin"    value={(stability.staticMarginM * 100).toFixed(1)} units="cm" normativeRange={[4, 15]} readout={staticMarginReadout} status={stability.staticMarginM > 0.04 ? 'good' : stability.staticMarginM > 0 ? 'warning' : 'bad'} dense />
            <MetricRow label="XCoM margin"      value={(stability.dynamicMarginM * 100).toFixed(1)} units="cm" normativeRange={[3, 12]} readout={xcomReadout} status={stability.dynamicMarginM > 0.03 ? 'good' : stability.dynamicMarginM > 0 ? 'warning' : 'bad'} dense />
            <MetricRow label="LoS cone score"   value={stability.losConeScorePct.toFixed(0)} units="%" normativeRange={[40, 100]} readout={buildLosConeReadout(stability.losConeScorePct)} status={stability.losConeScorePct > 60 ? 'good' : stability.losConeScorePct > 30 ? 'warning' : 'bad'} dense />
            <MetricRow label="Leg length"       value={stability.legLengthM.toFixed(2)} units="m" readout={buildLegLengthReadout(stability.legLengthM, statureM)} dense />
            <div className="text-[8px] text-gray-500 italic mt-1">XCoM = CoM + v / √(g/L) (Hof 2008).</div>
          </Panel>
        </section>
      </div>
    </div>
  );
}
