import { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { Dumbbell, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Target, TrendingUp, Shield, Loader2, Sparkles, Zap, ArrowRight, Clock, Activity, ShieldAlert, Crosshair, Image, BarChart3 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const ExerciseBodyDiagram = lazy(() => import('./ExerciseBodyDiagram'));
import type { InjuryMechanismResult } from '@/lib/injuryMechanismEngine';
import type { SlingAnalysisResult } from '@/lib/slingEngine';

interface ExerciseItem {
  name: string;
  targetStructure: string;
  targetFinding: string;
  sets: string;
  reps: string;
  tempo: string;
  loadGuidance: string;
  rationale: string;
  contraindications: string;
  progression: string;
}

interface ExerciseGroup {
  groupId: string;
  goalTitle: string;
  goalDescription: string;
  priority: number;
  exercises: ExerciseItem[];
}

interface ExercisePlan {
  exerciseGroups: ExerciseGroup[];
  clinicalNotes: string;
  irritabilityConsiderations: string;
}

interface ActivationStep {
  order: number;
  muscle: string;
  role: string;
  timing: string;
  cue: string;
}

interface ForceVector {
  direction: string;
  plane: string;
  resistanceType: string;
  loadDescription: string;
}

interface ProgressionStage {
  stage: number;
  name: string;
  description: string;
}

interface CustomExercise {
  name: string;
  targetSystem: string;
  clinicalTarget: string;
  startingPosition: string;
  movementInstructions: string[];
  activationPattern: ActivationStep[];
  forceVector: ForceVector;
  biomechanicalRationale: string;
  dosage: { sets: string; reps: string; tempo: string; restSeconds: string; frequency: string };
  safetyCues: string[];
  contraindications: string;
  progressionStages: ProgressionStage[];
}

interface CustomExerciseResult {
  customExercises: CustomExercise[];
  designRationale: string;
  safetyNotes: string;
}

interface PainMarkerInput {
  label: string;
  severity?: number;
  type?: string;
}

interface ExerciseEngineTabProps {
  mechanismAnalysis: InjuryMechanismResult | null;
  slingAnalysis: SlingAnalysisResult | null;
  painMarkers: PainMarkerInput[];
}

const GROUP_ICONS: Record<string, typeof Dumbbell> = {
  'Address Root Causes': Target,
  'Restore Sling Function': TrendingUp,
  'Reduce Compensatory Loading': Shield,
  'Pain Management & Mobility': AlertTriangle,
};

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  'Address Root Causes': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300', badge: 'bg-red-500/20 text-red-300' },
  'Restore Sling Function': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300', badge: 'bg-orange-500/20 text-orange-300' },
  'Reduce Compensatory Loading': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300' },
  'Pain Management & Mobility': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
};

const DEFAULT_COLORS = { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-300', badge: 'bg-violet-500/20 text-violet-300' };

const ROLE_COLORS: Record<string, string> = {
  prime_mover: 'bg-red-500/20 text-red-300 border-red-500/30',
  stabilizer: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  decelerator: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  force_transmitter: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const FOCUS_PRESETS = [
  { label: 'Anterior Oblique Sling', value: 'anterior oblique sling' },
  { label: 'Posterior Oblique Sling', value: 'posterior oblique sling' },
  { label: 'Lateral Sling', value: 'lateral sling' },
  { label: 'Deep Longitudinal Sling', value: 'deep longitudinal sling' },
  { label: 'Scapular-Shoulder Sling', value: 'scapular shoulder sling' },
  { label: 'Core Stability', value: 'core stability and anti-rotation' },
  { label: 'Hip-Spine Connection', value: 'hip-spine force transfer' },
  { label: 'Compensation Offloading', value: 'offload compensating structures' },
];

function ExerciseCard({ exercise, index }: { exercise: ExerciseItem; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-600/30 rounded bg-gray-800/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 p-2 text-left hover:bg-gray-700/20 transition-colors"
      >
        <span className="text-[10px] font-mono text-gray-500 mt-0.5 min-w-[16px]">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-gray-200">{exercise.name}</div>
          {exercise.targetFinding && (
            <div className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-1">
              <Target className="h-2.5 w-2.5 text-amber-400 shrink-0" />
              <span className="truncate">{exercise.targetFinding}</span>
            </div>
          )}
          <div className="flex gap-2 mt-1 text-[9px]">
            <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300">{exercise.sets || '?'} × {exercise.reps || '?'}</span>
            {exercise.tempo && exercise.tempo !== 'controlled' && (
              <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-400">Tempo: {exercise.tempo}</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0 mt-1" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-gray-700/30 pt-1.5">
          <div>
            <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Target Structure</div>
            <div className="text-[10px] text-gray-300">{exercise.targetStructure}</div>
          </div>
          <div>
            <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Load Guidance</div>
            <div className="text-[10px] text-gray-300">{exercise.loadGuidance}</div>
          </div>
          <div>
            <div className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider">Clinical Rationale</div>
            <div className="text-[10px] text-gray-300">{exercise.rationale}</div>
          </div>
          {exercise.contraindications && exercise.contraindications.toLowerCase() !== 'none' && (
            <div>
              <div className="text-[9px] font-medium text-red-400/80 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Contraindications
              </div>
              <div className="text-[10px] text-red-300/80">{exercise.contraindications}</div>
            </div>
          )}
          <div>
            <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" />
              Progression
            </div>
            <div className="text-[10px] text-gray-300">{exercise.progression}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomExerciseCard({ exercise, index }: { exercise: CustomExercise; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<'diagram' | 'illustration'>('diagram');
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);
  const [illustrationLoading, setIllustrationLoading] = useState(false);
  const [illustrationError, setIllustrationError] = useState<string | null>(null);
  const illustrationRequested = useRef(false);

  const toggleSection = (section: string) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  const generateIllustration = useCallback(async () => {
    if (illustrationLoading || illustrationUrl) return;
    setIllustrationLoading(true);
    setIllustrationError(null);
    try {
      const data = await apiRequest('/api/exercise-engine/generate-illustration', 'POST', {
        exerciseName: exercise.name,
        targetSystem: exercise.targetSystem,
        startingPosition: exercise.startingPosition,
        movementInstructions: exercise.movementInstructions,
        forceVector: {
          direction: exercise.forceVector.direction,
          plane: exercise.forceVector.plane,
          resistanceType: exercise.forceVector.resistanceType,
        },
        activationPattern: exercise.activationPattern.map(a => ({
          muscle: a.muscle,
          role: a.role,
        })),
      });
      if (data.imageUrl) {
        setIllustrationUrl(data.imageUrl);
      } else {
        setIllustrationError('No image returned');
      }
    } catch (err) {
      setIllustrationError(err instanceof Error ? err.message : 'Failed to generate');
      setVisualMode('diagram');
    } finally {
      setIllustrationLoading(false);
    }
  }, [exercise, illustrationLoading, illustrationUrl]);

  const handleExpand = useCallback(() => {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && !illustrationRequested.current) {
      illustrationRequested.current = true;
      generateIllustration();
    }
  }, [expanded, generateIllustration]);

  return (
    <div className="border border-cyan-500/30 rounded-lg bg-gradient-to-br from-cyan-950/30 to-gray-900/80 overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-start gap-2 p-2.5 text-left hover:bg-cyan-900/10 transition-colors"
      >
        <span className="text-[10px] font-mono text-cyan-500/70 mt-0.5 min-w-[16px]">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="text-[11px] font-semibold text-cyan-200">{exercise.name}</div>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5 shrink-0">
              <Sparkles className="h-2 w-2" />
              AI-Designed
            </span>
          </div>
          <div className="text-[9px] text-cyan-400/70 mt-0.5 flex items-center gap-1">
            <Crosshair className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{exercise.targetSystem}</span>
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5 truncate">{exercise.clinicalTarget}</div>
          <div className="flex gap-2 mt-1.5 text-[9px] flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-cyan-800/40 text-cyan-300 border border-cyan-700/30">
              {exercise.dosage.sets} × {exercise.dosage.reps}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-800/40 text-cyan-300/70 border border-cyan-700/30">
              {exercise.dosage.tempo}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-800/40 text-cyan-300/70 border border-cyan-700/30 flex items-center gap-0.5">
              <Clock className="h-2 w-2" />
              {exercise.dosage.frequency}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-cyan-500 shrink-0 mt-1" /> : <ChevronDown className="h-3 w-3 text-cyan-500 shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-cyan-800/30">
          <div className="p-2.5 border-b border-cyan-800/20">
            <div className="flex items-center gap-1 mb-2">
              <button
                onClick={() => setVisualMode('diagram')}
                className={`flex items-center gap-1 px-2 py-1 text-[9px] rounded transition-colors ${visualMode === 'diagram' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'}`}
              >
                <BarChart3 className="h-2.5 w-2.5" />
                Muscle Map
              </button>
              <button
                onClick={() => { setVisualMode('illustration'); if (!illustrationUrl && !illustrationLoading) generateIllustration(); }}
                className={`flex items-center gap-1 px-2 py-1 text-[9px] rounded transition-colors ${visualMode === 'illustration' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'}`}
              >
                <Image className="h-2.5 w-2.5" />
                AI Illustration
                {illustrationLoading && <Loader2 className="h-2 w-2 animate-spin" />}
              </button>
            </div>

            {visualMode === 'diagram' && (
              <Suspense fallback={<div className="h-[160px] flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-cyan-500" /></div>}>
                <ExerciseBodyDiagram
                  activationPattern={exercise.activationPattern}
                  forceVector={exercise.forceVector}
                />
              </Suspense>
            )}

            {visualMode === 'illustration' && (
              <div className="relative min-h-[120px]">
                {illustrationLoading && (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    <span className="text-[9px] text-gray-400">Generating exercise illustration...</span>
                  </div>
                )}
                {illustrationUrl && (
                  <img
                    src={illustrationUrl}
                    alt={`Illustration for ${exercise.name}`}
                    className="w-full rounded border border-cyan-800/30"
                    loading="lazy"
                  />
                )}
                {illustrationError && !illustrationLoading && (
                  <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-[9px] text-gray-400">Could not generate illustration</span>
                    <button
                      onClick={generateIllustration}
                      className="text-[8px] text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Try again
                    </button>
                    <button
                      onClick={() => setVisualMode('diagram')}
                      className="text-[8px] text-gray-400 hover:text-gray-300"
                    >
                      View muscle map instead
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-0.5 p-1.5 bg-gray-900/50">
            {['position', 'instructions', 'activation', 'forces', 'rationale', 'progression'].map(section => (
              <button
                key={section}
                onClick={() => toggleSection(section)}
                className={`px-2 py-1 text-[9px] rounded transition-colors ${activeSection === section ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'}`}
              >
                {section === 'position' && 'Starting Position'}
                {section === 'instructions' && 'Movement'}
                {section === 'activation' && 'Activation Pattern'}
                {section === 'forces' && 'Force Vectors'}
                {section === 'rationale' && 'Rationale'}
                {section === 'progression' && 'Progression'}
              </button>
            ))}
          </div>

          <div className="p-2.5 space-y-2">
            {activeSection === 'position' && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1">Starting Position</div>
                <div className="text-[10px] text-gray-300 leading-relaxed bg-gray-800/50 rounded p-2 border border-gray-700/30">{exercise.startingPosition}</div>
              </div>
            )}

            {activeSection === 'instructions' && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1.5">Movement Instructions</div>
                <div className="space-y-1">
                  {exercise.movementInstructions.map((step, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px]">
                      <ArrowRight className="h-2.5 w-2.5 text-cyan-500 shrink-0 mt-0.5" />
                      <span className="text-gray-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'activation' && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Activity className="h-2.5 w-2.5" />
                  Muscle Activation Sequence
                </div>
                <div className="space-y-1.5">
                  {exercise.activationPattern.sort((a, b) => a.order - b.order).map((step) => {
                    const roleClass = ROLE_COLORS[step.role] || ROLE_COLORS['force_transmitter'];
                    return (
                      <div key={step.order} className="flex items-start gap-2 bg-gray-800/40 rounded p-1.5 border border-gray-700/20">
                        <div className="flex flex-col items-center shrink-0">
                          <span className="text-[9px] font-mono text-cyan-500 bg-cyan-900/30 rounded-full w-5 h-5 flex items-center justify-center">{step.order}</span>
                          {step.order < exercise.activationPattern.length && (
                            <div className="w-px h-3 bg-cyan-800/40 mt-0.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-medium text-gray-200">{step.muscle}</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${roleClass}`}>
                              {step.role.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-[9px] text-gray-400 mt-0.5">{step.timing}</div>
                          <div className="text-[9px] text-cyan-400/70 mt-0.5 italic">Cue: "{step.cue}"</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'forces' && (
              <div className="space-y-2">
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Force Vector Analysis
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-gray-800/50 rounded p-1.5 border border-gray-700/30">
                    <div className="text-[8px] text-gray-500 uppercase tracking-wider">Direction</div>
                    <div className="text-[10px] text-gray-200 mt-0.5">{exercise.forceVector.direction}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-1.5 border border-gray-700/30">
                    <div className="text-[8px] text-gray-500 uppercase tracking-wider">Plane</div>
                    <div className="text-[10px] text-gray-200 mt-0.5">{exercise.forceVector.plane}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-1.5 border border-gray-700/30">
                    <div className="text-[8px] text-gray-500 uppercase tracking-wider">Resistance</div>
                    <div className="text-[10px] text-gray-200 mt-0.5">{exercise.forceVector.resistanceType}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-1.5 border border-gray-700/30">
                    <div className="text-[8px] text-gray-500 uppercase tracking-wider">Load</div>
                    <div className="text-[10px] text-gray-200 mt-0.5">{exercise.forceVector.loadDescription}</div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'rationale' && (
              <div className="space-y-2">
                <div>
                  <div className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider mb-1">Biomechanical Rationale</div>
                  <div className="text-[10px] text-gray-300 leading-relaxed">{exercise.biomechanicalRationale}</div>
                </div>
                {exercise.safetyCues.length > 0 && (
                  <div>
                    <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider mb-1">Safety Cues</div>
                    <div className="space-y-0.5">
                      {exercise.safetyCues.map((cue, i) => (
                        <div key={i} className="text-[9px] text-emerald-300/70 flex items-start gap-1">
                          <ShieldAlert className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                          <span>{cue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {exercise.contraindications && exercise.contraindications.toLowerCase() !== 'none' && (
                  <div>
                    <div className="text-[9px] font-medium text-red-400/80 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Contraindications
                    </div>
                    <div className="text-[10px] text-red-300/80">{exercise.contraindications}</div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'progression' && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1.5">Progression Ladder</div>
                <div className="space-y-1.5">
                  {exercise.progressionStages.sort((a, b) => a.stage - b.stage).map((stage) => (
                    <div key={stage.stage} className="flex items-start gap-2">
                      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        stage.stage === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        stage.stage === 2 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>{stage.stage}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-gray-200">{stage.name}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5">{stage.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!activeSection && (
              <div className="text-center py-2">
                <div className="text-[9px] text-gray-500">Select a section above to view details</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExerciseEngineTab({ mechanismAnalysis, slingAnalysis, painMarkers }: ExerciseEngineTabProps) {
  const [plan, setPlan] = useState<ExercisePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [customResult, setCustomResult] = useState<CustomExerciseResult | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [targetFocus, setTargetFocus] = useState('');
  const [showCustomDesigner, setShowCustomDesigner] = useState(false);
  const [showDesignRationale, setShowDesignRationale] = useState(false);
  const customAbortRef = useRef<AbortController | null>(null);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const buildPayload = useCallback(() => {
    const payload: Record<string, unknown> = {
      mechanismSummary: mechanismAnalysis?.overallMechanismSummary ?? '',
      causalChains: (mechanismAnalysis?.causalChains ?? []).map(chain =>
        chain.map(s => ({
          step: s.step,
          structure: s.structure,
          finding: s.finding,
          mechanism: s.mechanism ?? '',
          category: s.category ?? '',
          severity: s.severity ?? '',
        }))
      ),
      compensationCards: (mechanismAnalysis?.compensationCards ?? []).map(c => ({
        title: c.title,
        description: c.clinicalSignificance ?? '',
        severity: c.severity ?? '',
        primaryRegion: c.primaryDysfunction ?? '',
        compensatingRegion: c.compensatingStructures?.join(', ') ?? '',
      })),
      loadRedistribution: (mechanismAnalysis?.loadRedistribution ?? []).map(l => ({
        joint: l.joint,
        change: `${l.changePct > 0 ? '+' : ''}${l.changePct}%`,
        clinical: l.status,
      })),
      topContributors: mechanismAnalysis?.topContributors ?? [],
      kineticChainDysfunctions: (mechanismAnalysis?.kineticChainDysfunctions ?? []).map(k => ({
        chain: k.chainLabel ?? '',
        dysfunction: k.dysfunction ?? '',
        clinical: k.relevance ?? '',
      })),
      painMarkers: painMarkers.map(p => ({
        label: p.label,
        severity: p.severity,
        type: p.type,
      })),
    };

    if (slingAnalysis) {
      payload.slingData = {
        systemSummary: slingAnalysis.systemSummary,
        overallForceTransferScore: slingAnalysis.overallForceTransferScore,
        slings: slingAnalysis.slings.map(s => ({
          label: s.label,
          status: s.status,
          activationScore: s.activationScore,
          forceTransferQuality: s.forceTransferQuality,
          weakLinks: s.weakLinks.map(w => ({
            muscle: w.muscle,
            activationPct: w.activationPct,
            reason: w.reason,
          })),
          forceReroutes: s.forceReroutes.map(r => ({
            fromMuscle: r.fromMuscle,
            toMuscle: r.toMuscle,
            reroutePct: r.reroutePct,
            clinical: r.clinical,
          })),
          treatmentTargets: s.treatmentTargets.map(t => ({
            muscle: t.muscle,
            intervention: t.intervention,
            rationale: t.rationale,
          })),
          narrative: s.narrative,
        })),
      };
    }

    return payload;
  }, [mechanismAnalysis, slingAnalysis, painMarkers]);

  const generatePlan = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const payload = buildPayload();
      const result = await apiRequest('/api/exercise-engine/generate', 'POST', payload) as ExercisePlan;
      if (controller.signal.aborted) return;
      const sorted = {
        ...result,
        exerciseGroups: [...(result.exerciseGroups || [])].sort((a, b) => a.priority - b.priority),
      };
      setPlan(sorted);
      const allIds = new Set(sorted.exerciseGroups.map(g => g.groupId));
      setExpandedGroups(allIds);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [buildPayload]);

  const designCustomExercises = useCallback(async () => {
    if (customAbortRef.current) customAbortRef.current.abort();
    const controller = new AbortController();
    customAbortRef.current = controller;

    setCustomLoading(true);
    setCustomError(null);

    try {
      const payload = buildPayload();
      if (targetFocus) {
        payload.targetFocus = targetFocus;
      }
      const result = await apiRequest('/api/exercise-engine/design-custom', 'POST', payload) as CustomExerciseResult;
      if (controller.signal.aborted) return;
      setCustomResult(result);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setCustomError(msg);
    } finally {
      if (!controller.signal.aborted) setCustomLoading(false);
    }
  }, [buildPayload, targetFocus]);

  const hasData = mechanismAnalysis !== null || (painMarkers && painMarkers.length > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <Dumbbell className="h-8 w-8 text-gray-600 mb-2" />
        <div className="text-[11px] text-gray-400 mb-1">No clinical data available</div>
        <div className="text-[9px] text-gray-500">Place pain markers and run the mechanism analysis first to generate an AI exercise prescription.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-6 w-6 text-violet-400 animate-spin mb-3" />
        <div className="text-[11px] text-gray-300 mb-1">Generating exercise prescription...</div>
        <div className="text-[9px] text-gray-500">AI is reasoning through causal chains, compensations, and sling deficits</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <AlertTriangle className="h-6 w-6 text-red-400 mb-2" />
        <div className="text-[11px] text-red-300 mb-2">Failed to generate exercise plan</div>
        <div className="text-[9px] text-gray-400 mb-3">{error}</div>
        <button onClick={generatePlan} className="px-3 py-1.5 text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded hover:bg-violet-500/30 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  const customDesignerSection = (
    <div className={plan ? "border-t border-gray-700/50 pt-3 mt-3" : ""}>
      <button
        onClick={() => setShowCustomDesigner(!showCustomDesigner)}
        className="w-full flex items-center gap-2 p-2.5 text-left bg-gradient-to-r from-cyan-950/40 to-gray-900/60 border border-cyan-500/30 rounded-lg hover:from-cyan-950/60 hover:to-gray-900/80 transition-all"
      >
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-cyan-200">Custom Exercise Designer</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">AI Architect</span>
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">Design novel movements from biomechanical first principles</div>
        </div>
        {showCustomDesigner ? <ChevronUp className="h-3.5 w-3.5 text-cyan-500 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-cyan-500 shrink-0" />}
      </button>

      {showCustomDesigner && (
        <div className="mt-2 space-y-2">
          <div className="bg-gray-900/60 rounded-lg border border-gray-700/40 p-2.5 space-y-2">
            <div>
              <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Target Focus (optional)</div>
              <input
                type="text"
                value={targetFocus}
                onChange={(e) => setTargetFocus(e.target.value)}
                placeholder="e.g., anterior oblique sling, hip-spine connection..."
                className="w-full px-2.5 py-1.5 text-[10px] bg-gray-800/70 border border-gray-600/40 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {FOCUS_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setTargetFocus(preset.value)}
                  className={`px-2 py-0.5 text-[8px] rounded-full border transition-colors ${
                    targetFocus === preset.value
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-gray-800/40 text-gray-400 border-gray-600/30 hover:text-gray-200 hover:border-gray-500/40'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={designCustomExercises}
            disabled={customLoading}
            className="w-full px-4 py-2.5 text-[11px] font-medium bg-gradient-to-r from-cyan-600/20 to-cyan-500/10 text-cyan-300 border border-cyan-500/40 rounded-lg hover:from-cyan-600/30 hover:to-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {customLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Designing custom movements...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Design Custom Exercises
              </>
            )}
          </button>

          {customError && (
            <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-2.5">
              <div className="text-[10px] text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {customError}
              </div>
              <button
                onClick={designCustomExercises}
                className="mt-1.5 text-[9px] text-red-400 hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          )}

          {customResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-[11px] font-medium text-cyan-200">
                    {customResult.customExercises.length} Custom Exercises Designed
                  </span>
                </div>
                <button
                  onClick={designCustomExercises}
                  disabled={customLoading}
                  className="px-2 py-1 text-[9px] bg-cyan-900/30 text-cyan-400 border border-cyan-700/30 rounded hover:bg-cyan-900/50 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  Redesign
                </button>
              </div>

              {customResult.customExercises.map((ex, i) => (
                <CustomExerciseCard key={i} exercise={ex} index={i} />
              ))}

              {(customResult.designRationale || customResult.safetyNotes) && (
                <div className="border border-cyan-800/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowDesignRationale(!showDesignRationale)}
                    className="w-full flex items-center gap-2 p-2 text-left bg-cyan-950/20 hover:bg-cyan-950/30 transition-colors"
                  >
                    <Zap className="h-3 w-3 text-cyan-400 shrink-0" />
                    <span className="text-[10px] font-medium text-cyan-300 flex-1">Design Rationale & Safety</span>
                    {showDesignRationale ? <ChevronUp className="h-3 w-3 text-cyan-500" /> : <ChevronDown className="h-3 w-3 text-cyan-500" />}
                  </button>
                  {showDesignRationale && (
                    <div className="p-2.5 space-y-2 border-t border-cyan-800/30">
                      {customResult.designRationale && (
                        <div>
                          <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1">Program Design Rationale</div>
                          <div className="text-[10px] text-gray-300 leading-relaxed">{customResult.designRationale}</div>
                        </div>
                      )}
                      {customResult.safetyNotes && (
                        <div>
                          <div className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider mb-1">Safety Notes</div>
                          <div className="text-[10px] text-amber-200/70 leading-relaxed">{customResult.safetyNotes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!plan) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <Dumbbell className="h-8 w-8 text-violet-400/60 mb-3" />
          <div className="text-[11px] text-gray-300 mb-1">AI Exercise Prescription</div>
          <div className="text-[9px] text-gray-500 mb-4 text-center max-w-[250px]">
            Generate a custom exercise plan based on the current mechanism analysis, sling deficits, and compensation patterns.
          </div>
          <button onClick={generatePlan} className="px-4 py-2 text-[11px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/40 rounded-lg hover:bg-violet-500/30 transition-colors flex items-center gap-2">
            <Dumbbell className="h-3.5 w-3.5" />
            Generate Exercise Plan
          </button>
        </div>
        {customDesignerSection}
      </div>
    );
  }

  const totalExercises = plan.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[11px] font-medium text-gray-200">
            {totalExercises} Exercises · {plan.exerciseGroups.length} Groups
          </span>
        </div>
        <button
          onClick={generatePlan}
          className="px-2 py-1 text-[9px] bg-gray-700/40 text-gray-400 border border-gray-600/30 rounded hover:text-gray-200 hover:bg-gray-700/60 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Regenerate
        </button>
      </div>

      {plan.exerciseGroups.map(group => {
        const colors = GROUP_COLORS[group.goalTitle] ?? DEFAULT_COLORS;
        const Icon = GROUP_ICONS[group.goalTitle] ?? Dumbbell;
        const isExpanded = expandedGroups.has(group.groupId);

        return (
          <div key={group.groupId} className={`border ${colors.border} rounded-lg overflow-hidden`}>
            <button
              onClick={() => toggleGroup(group.groupId)}
              className={`w-full flex items-center gap-2 p-2 text-left ${colors.bg} hover:brightness-110 transition-all`}
            >
              <Icon className={`h-3.5 w-3.5 ${colors.text} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium ${colors.text}`}>{group.goalTitle}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                    P{group.priority} · {group.exercises.length} ex
                  </span>
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 truncate">{group.goalDescription}</div>
              </div>
              {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0" />}
            </button>
            {isExpanded && (
              <div className="p-2 space-y-1.5">
                {group.exercises.map((ex, i) => (
                  <ExerciseCard key={`${group.groupId}-${i}`} exercise={ex} index={i} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {(plan.clinicalNotes || plan.irritabilityConsiderations) && (
        <div className="border border-gray-600/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-full flex items-center gap-2 p-2 text-left bg-gray-800/40 hover:bg-gray-700/30 transition-colors"
          >
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="text-[10px] font-medium text-gray-300 flex-1">Clinical Notes & Irritability Considerations</span>
            {showNotes ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
          </button>
          {showNotes && (
            <div className="p-2 space-y-2 border-t border-gray-700/30">
              {plan.clinicalNotes && (
                <div>
                  <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mb-1">Clinical Notes</div>
                  <div className="text-[10px] text-gray-300 leading-relaxed">{plan.clinicalNotes}</div>
                </div>
              )}
              {plan.irritabilityConsiderations && (
                <div>
                  <div className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider mb-1">Irritability Considerations</div>
                  <div className="text-[10px] text-amber-200/70 leading-relaxed">{plan.irritabilityConsiderations}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {customDesignerSection}
    </div>
  );
}
