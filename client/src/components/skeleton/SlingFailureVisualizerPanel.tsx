import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Pause, RefreshCw, AlertTriangle, Activity, ChevronDown, ChevronUp, Sparkles, X, Loader2, GitCompare } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { SlingAnalysisResult, SlingId, SlingResult } from '@/lib/slingEngine';
import type { SlingFailureScenario } from '@shared/schema';
import type { PathologyCompensationResult } from '@/lib/pathologyCompensationEngine';
import {
  generateSlingFailureScenarioLocal,
  buildScenarioFingerprint,
  getTriggerMovementById,
  TRIGGER_MOVEMENT_LIBRARY,
  composeActualSequence,
  mergeWithPathologyCompensation,
  mergeAiAndLocalScenarios,
} from '@/lib/slingFailureScenarioEngine';
import { registerDynamicMovement, unregisterDynamicMovement } from '@/lib/movementSequences';
import type { AnimationState } from './PureThreeGLBViewer';

export interface SlingFailureVisualizerSelection {
  scenario: SlingFailureScenario;
  sling: SlingResult;
  ghostMode: GhostMode;
}

export type GhostMode = 'actual' | 'intended' | 'compare';

interface Props {
  caseId: string;
  condition?: string | null;
  patientFactors?: string[];
  analysis: SlingAnalysisResult | null;
  markers: Array<{ nearestBone?: string; anatomicalLabel?: string; severity?: number }>;
  animationState: AnimationState;
  onAnimationStateChange: (s: AnimationState) => void;
  /** Tells the parent which sling+scenario is currently active so it can
   *  drive the SVG overlay over the 3D viewer. Pass `null` to hide. */
  onActiveScenarioChange: (sel: SlingFailureVisualizerSelection | null) => void;
  onClose?: () => void;
  /** Optional — pathology engine output is folded into each scenario's
   *  joint deltas so the live "actual" playback respects pathology priors. */
  pathologyCompensation?: PathologyCompensationResult | null;
}

const STATUS_COLOR: Record<SlingResult['status'], string> = {
  underperforming: 'text-orange-300 bg-orange-500/15 border-orange-500/40',
  overloaded: 'text-red-300 bg-red-500/15 border-red-500/40',
  compensating: 'text-amber-300 bg-amber-500/15 border-amber-500/40',
  normal: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40',
};

export default function SlingFailureVisualizerPanel(props: Props) {
  const {
    caseId, condition, patientFactors, analysis, markers,
    animationState, onAnimationStateChange, onActiveScenarioChange, onClose,
    pathologyCompensation,
  } = props;

  const [collapsed, setCollapsed] = useState(false);
  const [scenarios, setScenarios] = useState<SlingFailureScenario[]>([]);
  const [activeSlingId, setActiveSlingId] = useState<SlingId | null>(null);
  const [ghostMode, setGhostMode] = useState<GhostMode>('compare');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiAttempted, setAiAttempted] = useState(false);
  const compareTickRef = useRef<number>(0);
  const [, forceTick] = useState(0);

  const compromised = useMemo(
    () => (analysis?.slings ?? []).filter(s => s.status !== 'normal'),
    [analysis],
  );

  const fingerprint = useMemo(
    () => buildScenarioFingerprint({ caseId, condition, markers, analysis }),
    [caseId, condition, markers, analysis],
  );

  // Always have local scenarios available so panel works offline.
  // Local templates are merged with pathologyCompensation posturalDeviations
  // so the joint deltas reflect pathology priors as well as sling priors.
  const localScenarios = useMemo(() => {
    return compromised
      .map(s => generateSlingFailureScenarioLocal(s, { condition }))
      .map(sc => mergeWithPathologyCompensation(sc, pathologyCompensation));
  }, [compromised, condition, pathologyCompensation]);

  const fetchMutation = useMutation({
    mutationFn: async (refresh: boolean) => {
      const payload = {
        caseId,
        fingerprint,
        condition: condition ?? undefined,
        patientFactors: patientFactors ?? undefined,
        refresh,
        slings: compromised.map(s => ({
          slingId: s.slingId,
          slingLabel: s.label,
          status: s.status,
          activationScore: s.activationScore,
          weakLinks: s.weakLinks.map(w => ({ muscle: w.muscle, activationPct: w.activationPct })),
          bonePathway: s.bonePathway,
          forceTransferQuality: s.forceTransferQuality,
        })),
        markers: markers.map(m => ({
          nearestBone: m.nearestBone,
          anatomicalLabel: m.anatomicalLabel,
          severity: m.severity,
        })),
      };
      const data = await apiRequest('/api/sling-failure-scenarios', 'POST', payload);
      return data;
    },
    onSuccess: (data: { scenarios: SlingFailureScenario[] }) => {
      const ai = Array.isArray(data?.scenarios) ? data.scenarios : [];
      // Always guarantee one scenario per compromised sling — merge AI
      // results over local fallbacks so partial AI responses don't drop
      // any sling. Then fold in pathology compensation deviations.
      const merged = mergeAiAndLocalScenarios(ai, localScenarios)
        .map(sc => mergeWithPathologyCompensation(sc, pathologyCompensation));
      setScenarios(merged);
      setErrorMsg(ai.length > 0 && ai.length < localScenarios.length
        ? 'AI returned a partial set — missing slings filled from local engine.'
        : null);
    },
    onError: (err: any) => {
      setScenarios(localScenarios);
      setErrorMsg('AI scenario generation unavailable — using deterministic local scenarios.');
      console.warn('[SlingFailureVisualizer] AI failed, using local fallback:', err?.message || err);
    },
  });

  // Auto-fetch on fingerprint change (case+marker+sling fingerprint).
  useEffect(() => {
    if (compromised.length === 0) {
      setScenarios([]);
      setActiveSlingId(null);
      onActiveScenarioChange(null);
      setAiAttempted(false);
      return;
    }
    // Optimistic: show local immediately while we ask for AI
    setScenarios(localScenarios);
    if (!aiAttempted) {
      setAiAttempted(true);
      fetchMutation.mutate(false);
    } else {
      fetchMutation.mutate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, compromised.length]);

  // Sync the active scenario to the parent.
  const activeScenario = useMemo(
    () => scenarios.find(s => s.slingId === activeSlingId) ?? null,
    [scenarios, activeSlingId],
  );

  useEffect(() => {
    if (!activeScenario) {
      onActiveScenarioChange(null);
      return;
    }
    const sling = analysis?.slings.find(s => s.slingId === activeScenario.slingId);
    if (sling) {
      onActiveScenarioChange({ scenario: activeScenario, sling, ghostMode });
    }
  }, [activeScenario, analysis, ghostMode, onActiveScenarioChange]);

  // Register all trigger movements once (intended sequences) so the player
  // can find them. Per-scenario "actual" sequences (with deltas baked in)
  // are registered lazily when a scenario plays.
  useEffect(() => {
    TRIGGER_MOVEMENT_LIBRARY.forEach(t => registerDynamicMovement(t.sequence));
    return () => {
      TRIGGER_MOVEMENT_LIBRARY.forEach(t => unregisterDynamicMovement(t.sequence.id));
    };
  }, []);

  // Track per-scenario registered "actual" sequence ids so we can clean up.
  const registeredActualIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    return () => {
      registeredActualIds.current.forEach(id => unregisterDynamicMovement(id));
      registeredActualIds.current.clear();
    };
  }, []);

  /** Returns the sequence id the player should run for a given scenario,
   *  honouring the current ghostMode. In compare mode we alternate every
   *  ~1.4s between intended and actual so the clinician sees the delta
   *  as a frame-by-frame ghost flicker. */
  const resolveSequenceId = useCallback((scenario: SlingFailureScenario, mode: GhostMode): string => {
    const trigger = getTriggerMovementById(scenario.triggerMovementId);
    if (!trigger) return '';
    if (mode === 'intended') return trigger.sequence.id;
    // Build & register the per-scenario "actual" sequence with deltas baked in.
    const actual = composeActualSequence(trigger, scenario);
    if (!registeredActualIds.current.has(actual.id)) {
      registerDynamicMovement(actual);
      registeredActualIds.current.add(actual.id);
    }
    if (mode === 'actual') return actual.id;
    // compare → flip every 1.4s between intended/actual
    const flipped = (compareTickRef.current % 2) === 1;
    return flipped ? trigger.sequence.id : actual.id;
  }, []);

  // Keep latest animationState in a ref so the compare-mode interval
  // doesn't tear down on every 60fps progress update.
  const animationStateRef = useRef(animationState);
  useEffect(() => { animationStateRef.current = animationState; }, [animationState]);

  // Drive the compare-mode flicker — alternates currentMovement between
  // intended and actual every ~1.4s so the clinician sees the deviation
  // as a ghost-frame flicker on the live skeleton.
  useEffect(() => {
    if (ghostMode !== 'compare' || !animationState.isPlaying || !activeScenario) return;
    const id = window.setInterval(() => {
      compareTickRef.current = (compareTickRef.current + 1) % 1000;
      const seqId = resolveSequenceId(activeScenario, 'compare');
      onAnimationStateChange({
        ...animationStateRef.current,
        currentMovement: seqId,
      });
      forceTick(c => (c + 1) % 1000);
    }, 1400);
    return () => window.clearInterval(id);
  }, [ghostMode, animationState.isPlaying, activeScenario, resolveSequenceId, onAnimationStateChange]);

  const handlePlay = useCallback((scenario: SlingFailureScenario) => {
    const trigger = getTriggerMovementById(scenario.triggerMovementId);
    if (!trigger) return;
    setActiveSlingId(scenario.slingId);
    const seqId = resolveSequenceId(scenario, ghostMode);
    onAnimationStateChange({
      isPlaying: true,
      currentMovement: seqId,
      progress: 0,
      speed: animationState.speed || 1,
    });
  }, [animationState.speed, ghostMode, resolveSequenceId, onAnimationStateChange]);

  const handlePause = useCallback(() => {
    onAnimationStateChange({ ...animationState, isPlaying: !animationState.isPlaying });
  }, [animationState, onAnimationStateChange]);

  const handleScrub = useCallback((t: number) => {
    onAnimationStateChange({ ...animationState, isPlaying: false, progress: Math.max(0, Math.min(1, t)) });
  }, [animationState, onAnimationStateChange]);

  const handleJumpToFailure = useCallback((scenario: SlingFailureScenario) => {
    const trigger = getTriggerMovementById(scenario.triggerMovementId);
    if (!trigger) return;
    setActiveSlingId(scenario.slingId);
    // Jumping to failure should show the compensated pose, otherwise the
    // user sees the unaffected intended pose and the failure looks invisible.
    const seqId = resolveSequenceId(scenario, ghostMode === 'intended' ? 'actual' : ghostMode);
    onAnimationStateChange({
      isPlaying: false,
      currentMovement: seqId,
      progress: scenario.failureFrame,
      speed: animationState.speed || 1,
    });
  }, [animationState.speed, ghostMode, resolveSequenceId, onAnimationStateChange]);

  if (compromised.length === 0) return null;

  return (
    <div
      className="absolute z-30 w-80 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/60 shadow-2xl overflow-hidden flex flex-col"
      style={{ top: 'calc(3.5rem + 350px)', right: '0.75rem', maxHeight: 'calc(100vh - 24rem)' }}
      data-testid="sling-failure-visualizer-panel"
    >
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-rose-500/15 to-rose-500/5 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] font-semibold text-rose-200 uppercase tracking-wider">Sling Failure Visualizer</span>
          <span className="text-[9px] text-rose-300/70 font-mono bg-rose-500/15 px-1.5 py-0.5 rounded">{compromised.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Ghost-mode segmented control — drives whether the live skeleton
              plays the intended trigger, the compensated (actual) sequence
              with joint deltas baked in, or alternates between them as a
              ghost-layer comparison. */}
          <div className="flex items-center bg-gray-800/80 border border-gray-700/60 rounded overflow-hidden mr-1" title="Ghost mode">
            {(['intended','actual','compare'] as GhostMode[]).map(m => (
              <button
                key={m}
                onClick={() => {
                  setGhostMode(m);
                  if (activeScenario) {
                    const seqId = resolveSequenceId(activeScenario, m);
                    onAnimationStateChange({ ...animationState, currentMovement: seqId });
                  }
                }}
                className={`px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider font-medium transition-colors ${
                  ghostMode === m
                    ? m === 'intended' ? 'bg-emerald-500/30 text-emerald-200'
                    : m === 'actual'   ? 'bg-rose-500/30 text-rose-200'
                                       : 'bg-amber-500/30 text-amber-200'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                data-testid={`sfv-ghost-mode-${m}`}
              >
                {m === 'compare' ? <GitCompare className="w-2.5 h-2.5 inline" /> : m[0].toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchMutation.mutate(true)}
            disabled={fetchMutation.isPending}
            title="Regenerate scenarios"
            className="p-1 rounded hover:bg-white/10 disabled:opacity-50"
          >
            {fetchMutation.isPending ? (
              <Loader2 className="w-3 h-3 text-rose-300 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 text-rose-300" />
            )}
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded hover:bg-white/10"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronUp className="w-3 h-3 text-gray-400" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10" title="Close">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-2">
          {errorMsg && (
            <div className="text-[9.5px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 leading-snug">
              {errorMsg}
            </div>
          )}
          {fetchMutation.isPending && scenarios.length === 0 && (
            <div className="flex items-center gap-2 px-2 py-2 text-[10px] text-rose-300/80">
              <Loader2 className="w-3 h-3 animate-spin" />
              Composing failure scenarios…
            </div>
          )}
          {scenarios.map(scenario => {
            const sling = analysis?.slings.find(s => s.slingId === scenario.slingId);
            if (!sling) return null;
            const isActive = activeSlingId === scenario.slingId;
            const isPlayingThis = isActive && !!animationState.isPlaying;
            const trigger = getTriggerMovementById(scenario.triggerMovementId);
            return (
              <div
                key={scenario.slingId}
                className={`rounded-lg border p-2 transition-all ${
                  isActive
                    ? 'bg-rose-500/12 border-rose-500/50 ring-1 ring-rose-500/30'
                    : 'bg-gray-800/70 border-gray-700/50 hover:border-rose-500/30'
                }`}
                data-testid={`sfv-card-${scenario.slingId}`}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => isPlayingThis ? handlePause() : handlePlay(scenario)}
                    className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                      isPlayingThis
                        ? 'bg-rose-500/30 text-rose-200 hover:bg-rose-500/40'
                        : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                    }`}
                    title={isPlayingThis ? 'Pause' : 'Play this scenario'}
                    data-testid={`sfv-play-${scenario.slingId}`}
                  >
                    {isPlayingThis ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sling.color }} />
                      <div className="text-[11px] font-semibold text-gray-100 truncate">{scenario.slingLabel}</div>
                      <span className={`text-[8.5px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-medium ${STATUS_COLOR[sling.status]}`}>
                        {sling.status}
                      </span>
                      <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300 border border-gray-600/40 font-mono">
                        {scenario.source === 'ai' ? 'AI' : 'local'} · {Math.round(scenario.confidence * 100)}%
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <div className="text-[10.5px] font-medium text-rose-200">{scenario.triggerMovementLabel}</div>
                      <div className="text-[9.5px] text-gray-400 mt-0.5 leading-snug">{scenario.triggerReason}</div>
                    </div>

                    {/* Timeline scrubber with failure-frame marker */}
                    {isActive && trigger && (
                      <div className="mt-2">
                        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500/40 to-rose-500/70 rounded-full"
                            style={{ width: `${(animationState.progress * 100).toFixed(1)}%` }}
                          />
                          {/* Failure-frame marker */}
                          <button
                            onClick={() => handleJumpToFailure(scenario)}
                            className="absolute inset-y-0 -translate-x-1/2 w-1.5 bg-red-400 rounded-full hover:bg-red-300 cursor-pointer pointer-events-auto"
                            style={{ left: `${(scenario.failureFrame * 100).toFixed(1)}%` }}
                            title={`Failure frame · ${Math.round(scenario.failureFrame * 100)}%`}
                            data-testid={`sfv-failure-marker-${scenario.slingId}`}
                          />
                          {/* Scrub overlay */}
                          <input
                            type="range"
                            min={0}
                            max={1000}
                            value={Math.round(animationState.progress * 1000)}
                            onChange={(e) => handleScrub(parseInt(e.target.value, 10) / 1000)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[8.5px] text-gray-500 font-mono">
                          <span>{Math.round(animationState.progress * 100)}%</span>
                          <span className="text-red-400/80">✕ {Math.round(scenario.failureFrame * 100)}% failure</span>
                          <span>100%</span>
                        </div>
                      </div>
                    )}

                    {/* Intended vs actual joint deltas */}
                    {isActive && scenario.jointDeltas.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-[9px] text-gray-400 uppercase tracking-wider font-medium flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                          Intended vs actual
                        </div>
                        {scenario.jointDeltas.slice(0, 4).map((d, i) => {
                          const delta = d.actualDeg - d.intendedDeg;
                          const dir = delta >= 0 ? '+' : '';
                          return (
                            <div key={i} className="bg-gray-800/60 rounded px-2 py-1">
                              <div className="flex items-center justify-between text-[9.5px]">
                                <span className="text-gray-300 font-medium">{prettyJoint(d.joint)} · {d.axis}</span>
                                <span className="font-mono">
                                  <span className="text-emerald-400">{d.intendedDeg.toFixed(0)}°</span>
                                  <span className="text-gray-500 mx-1">→</span>
                                  <span className="text-rose-300">{d.actualDeg.toFixed(0)}°</span>
                                  <span className={`ml-1 text-[8.5px] ${Math.abs(delta) > 4 ? 'text-rose-400 font-bold' : 'text-gray-500'}`}>
                                    ({dir}{delta.toFixed(0)}°)
                                  </span>
                                </span>
                              </div>
                              {d.description && (
                                <div className="text-[8.5px] text-gray-500 mt-0.5 leading-snug">{d.description}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Narration */}
                    {isActive && (
                      <div className="mt-2 bg-rose-500/10 border border-rose-500/30 rounded px-2 py-1.5">
                        <div className="text-[9px] text-rose-300/80 uppercase tracking-wider font-medium mb-0.5 flex items-center gap-1">
                          <Activity className="w-2.5 h-2.5" />
                          Why it breaks
                        </div>
                        <p className="text-[9.5px] text-rose-100/90 leading-snug">{scenario.narration}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                            ✕ {prettyMuscle(scenario.weakSegmentMuscle)}
                          </span>
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            ↳ reroute → {prettyMuscle(scenario.rerouteTargetMuscle)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function prettyMuscle(m: string): string {
  return m.replace(/_/g, ' ');
}
function prettyJoint(j: string): string {
  return j.replace(/([A-Z])/g, ' $1').replace(/^\s/, '').toLowerCase();
}
