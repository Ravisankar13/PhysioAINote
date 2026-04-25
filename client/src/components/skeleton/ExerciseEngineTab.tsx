import { useState, useCallback, useRef, useMemo, useEffect, lazy, Suspense } from 'react';
import { Dumbbell, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Target, TrendingUp, Shield, Loader2, Sparkles, Zap, ArrowRight, Clock, Activity, ShieldAlert, Crosshair, Image, BarChart3, Link2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AddToPlanButton, makeCartId } from '@/lib/planCart';
import { matchRecommendationsForItem, sortByDriverRole, type SlingDrivenRecommendation } from '@/lib/slingDriverAnalysis';

const ExerciseBodyDiagram = lazy(() => import('./ExerciseBodyDiagram'));
import type { InjuryMechanismResult } from '@/lib/injuryMechanismEngine';
import type { SlingAnalysisResult } from '@/lib/slingEngine';
import type { RecoveryGoalProfile, GoalGapAnalysis, ClinicalStateInput } from '@/lib/goalStateEngine';
import { buildPrescriptionContext, scaleDosage, type PrescriptionContext, type DosageScaling } from '@/lib/prescriptionAdapterEngine';

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
  // ---- Loading Engine (Task #231) ----
  /** Server-computed exercise id used by the loading engine. */
  exerciseId?: string;
  /** Optimal loading prescription that overrides the AI dosage for tendinopathy patients. */
  optimalLoad?: import('@shared/schema').OptimalLoadPrescription;
  /** Projected weekly progression (next 8–12 weeks) when loading engine is active. */
  loadingProjection?: import('@shared/schema').OptimalLoadPrescription[];
  /** Set when the loading engine swapped this exercise for a protocol-safe alternative. */
  swapNotice?: { from: string; reason: string };
}

interface CustomExerciseResult {
  customExercises: CustomExercise[];
  designRationale: string;
  safetyNotes: string;
  /** Loading-engine plan attached when the patient has a tendinopathy. */
  loadingPlan?: import('@shared/schema').TendinopathyLoadingPlan;
  /** Applicability metadata: tells the UI whether the loading engine ran and why not. */
  loadingEngine?: {
    applicable: boolean;
    reason?: string;
    site?: import('@shared/schema').TendinopathySite;
  };
  /** Server-computed diff against the previously-stored loading plan (Task #231). */
  loadingDiff?: import('@shared/schema').LoadingPlanDiff;
}

interface PainMarkerInput {
  label: string;
  severity?: number;
  type?: string;
}

export type { CustomExercise, CustomExerciseResult };

interface ExerciseEngineTabProps {
  mechanismAnalysis: InjuryMechanismResult | null;
  slingAnalysis: SlingAnalysisResult | null;
  painMarkers: PainMarkerInput[];
  /** Sling-driven recommendations (Task #235) — optional. When supplied,
   *  matching cards show a "Sling-driven · <name>" chip and the list is
   *  reordered so restore items rank above calm-compensatory ones. */
  slingDrivenRecommendations?: SlingDrivenRecommendation[];
  onCustomExerciseResult?: (result: CustomExerciseResult | null) => void;
  goalProfile?: RecoveryGoalProfile | null;
  clinicalState?: ClinicalStateInput | null;
  goalGap?: GoalGapAnalysis | null;
  sessionPrescription?: PrescriptionContext | null;
  sessionPrescriptionNum?: number | null;
  pendingGenerate?: boolean;
  onGenerateStarted?: () => void;
  onGenerateComplete?: (success: boolean) => void;
  // ---- Loading Engine handshake (Task #231) ----
  /** Free-text condition / diagnosis name — passed to the loading engine to detect tendinopathies. */
  conditionName?: string;
  /** Patient factors (age, irritability, medication flags…) for the loading engine. */
  loadingPatientFactors?: import('@shared/schema').LoadingPatientFactors;
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

function ExerciseCard({ exercise, index, dosageScalingData, slingMatch }: { exercise: ExerciseItem; index: number; dosageScalingData?: DosageScaling | null; slingMatch?: SlingDrivenRecommendation }) {
  const [expanded, setExpanded] = useState(false);

  const displaySets = exercise.sets || '?';
  const displayReps = exercise.reps || '?';
  const scaled = dosageScalingData && exercise.sets && exercise.reps
    ? scaleDosage(parseInt(exercise.sets) || 3, exercise.reps, dosageScalingData)
    : null;

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
          <div className="flex gap-2 mt-1 text-[9px] flex-wrap items-center">
            <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300">{scaled ? `${scaled.sets} × ${scaled.reps}` : `${displaySets} × ${displayReps}`}</span>
            {exercise.tempo && exercise.tempo !== 'controlled' && (
              <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-400">Tempo: {exercise.tempo}</span>
            )}
            {slingMatch && (
              <span
                className={`px-1.5 py-0.5 rounded border flex items-center gap-0.5 text-[8.5px] ${
                  slingMatch.role === 'restore'
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                    : slingMatch.role === 'address-driver'
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                      : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                }`}
                title={slingMatch.rationale}
                data-testid={`sling-chip-${exercise.name}`}
              >
                <Link2 className="h-2 w-2" />
                Sling-driven · {slingMatch.slingLabel}
              </span>
            )}
            <AddToPlanButton
              size="xs"
              item={{
                id: makeCartId('exercise', exercise.name),
                modality: 'exercise',
                name: exercise.name,
                targetStructure: exercise.targetStructure,
                targetFinding: exercise.targetFinding,
                dosage: scaled ? `${scaled.sets} × ${scaled.reps}` : `${displaySets} × ${displayReps}`,
                rationale: exercise.rationale,
                contraindications: exercise.contraindications,
                slingTag: slingMatch?.slingLabel,
                slingRole: slingMatch?.role,
              }}
            />
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

/**
 * Inline structured editor for the patient factors that drive the
 * Optimal Loading Engine. Backed by `/api/loading-context/:condition`
 * so values persist across recomputes/reloads/devices for the same
 * authenticated clinician.
 */
function LoadingFactorsEditor({
  initial,
  saving,
  onSave,
  onClose,
}: {
  initial: import('@shared/schema').LoadingPatientFactors | undefined;
  saving: boolean;
  onSave: (pf: import('@shared/schema').LoadingPatientFactors) => void;
  onClose: () => void;
}) {
  const seed: import('@shared/schema').LoadingPatientFactors = {
    age: initial?.age,
    irritability: initial?.irritability,
    recoveryPhase: initial?.recoveryPhase,
    history: {
      medicationFlags: { ...(initial?.history?.medicationFlags ?? {}) },
      metabolicConditions: { ...(initial?.history?.metabolicConditions ?? {}) },
      hormonalStatus: { ...(initial?.history?.hormonalStatus ?? {}) },
      priorInjurySameSite: initial?.history?.priorInjurySameSite,
      trainingHistory: { ...(initial?.history?.trainingHistory ?? {}) },
    },
  };
  const [draft, setDraft] = useState<import('@shared/schema').LoadingPatientFactors>(seed);
  const setMed = (k: keyof NonNullable<NonNullable<typeof draft.history>['medicationFlags']>) =>
    setDraft(d => ({ ...d, history: { ...d.history, medicationFlags: { ...(d.history?.medicationFlags ?? {}), [k]: !d.history?.medicationFlags?.[k] } } }));
  const setMet = (k: keyof NonNullable<NonNullable<typeof draft.history>['metabolicConditions']>) =>
    setDraft(d => ({ ...d, history: { ...d.history, metabolicConditions: { ...(d.history?.metabolicConditions ?? {}), [k]: !d.history?.metabolicConditions?.[k] } } }));

  const Cb = ({ checked, onChange, label, testId }: { checked?: boolean; onChange: () => void; label: string; testId: string }) => (
    <label className="flex items-center gap-1 text-[10px] text-slate-200 cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={onChange} className="h-3 w-3 accent-emerald-500" data-testid={testId} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="rounded-lg border border-slate-600/30 bg-slate-900/40 p-2 space-y-2 text-[10px]" data-testid="editor-loading-factors">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-200 uppercase tracking-wider text-[9px]">Loading Engine — Patient Factors</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-[9px]">Close</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-slate-400">Age</span>
          <input
            type="number" min={0} max={120}
            value={draft.age ?? ''}
            onChange={e => setDraft(d => ({ ...d, age: e.target.value ? Number(e.target.value) : undefined }))}
            className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-100"
            data-testid="input-loading-age"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-slate-400">Irritability</span>
          <select
            value={draft.irritability ?? ''}
            onChange={e => setDraft(d => ({ ...d, irritability: (e.target.value || undefined) as 'low' | 'moderate' | 'high' | undefined }))}
            className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-100"
            data-testid="select-loading-irritability"
          >
            <option value="">—</option><option value="low">low</option><option value="moderate">moderate</option><option value="high">high</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-slate-400">Phase</span>
          <select
            value={draft.recoveryPhase ?? ''}
            onChange={e => setDraft(d => ({ ...d, recoveryPhase: (e.target.value || undefined) as 'reactive' | 'disrepair' | 'remodelling' | 'return_to_sport' | undefined }))}
            className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-100"
            data-testid="select-loading-phase"
          >
            <option value="">—</option><option value="reactive">reactive</option><option value="disrepair">disrepair</option><option value="remodelling">remodelling</option><option value="return_to_sport">return to sport</option>
          </select>
        </label>
      </div>
      <div className="space-y-1">
        <span className="text-slate-400 uppercase tracking-wider text-[9px]">Medications</span>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <Cb label="Statins" checked={draft.history?.medicationFlags?.statins} onChange={() => setMed('statins')} testId="cb-med-statins" />
          <Cb label="Fluoroquinolones" checked={draft.history?.medicationFlags?.fluoroquinolones} onChange={() => setMed('fluoroquinolones')} testId="cb-med-fq" />
          <Cb label="Corticosteroids" checked={draft.history?.medicationFlags?.corticosteroids} onChange={() => setMed('corticosteroids')} testId="cb-med-cortico" />
          <Cb label="Aromatase inhibitors" checked={draft.history?.medicationFlags?.aromataseInhibitors} onChange={() => setMed('aromataseInhibitors')} testId="cb-med-ai" />
        </div>
      </div>
      <div className="space-y-1">
        <span className="text-slate-400 uppercase tracking-wider text-[9px]">Metabolic / endocrine</span>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <Cb label="Diabetes" checked={draft.history?.metabolicConditions?.diabetes} onChange={() => setMet('diabetes')} testId="cb-met-diabetes" />
          <Cb label="Thyroid disorder" checked={draft.history?.metabolicConditions?.thyroid} onChange={() => setMet('thyroid')} testId="cb-met-thyroid" />
          <Cb label="Hypercholesterolaemia" checked={draft.history?.metabolicConditions?.hypercholesterolaemia} onChange={() => setMet('hypercholesterolaemia')} testId="cb-met-chol" />
          <Cb label="Obesity" checked={draft.history?.metabolicConditions?.obesity} onChange={() => setMet('obesity')} testId="cb-met-obesity" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-slate-400">Sex</span>
          <select
            value={draft.history?.hormonalStatus?.sex ?? ''}
            onChange={e => setDraft(d => ({ ...d, history: { ...d.history, hormonalStatus: { ...(d.history?.hormonalStatus ?? {}), sex: (e.target.value || undefined) as 'male' | 'female' | 'other' | undefined } } }))}
            className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-100"
            data-testid="select-loading-sex"
          >
            <option value="">—</option><option value="female">female</option><option value="male">male</option><option value="other">other</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-slate-400">Menopause status</span>
          <select
            value={draft.history?.hormonalStatus?.menopauseStatus ?? ''}
            onChange={e => setDraft(d => ({ ...d, history: { ...d.history, hormonalStatus: { ...(d.history?.hormonalStatus ?? {}), menopauseStatus: (e.target.value || undefined) as 'premenopausal' | 'perimenopausal' | 'postmenopausal' | 'na' | undefined } } }))}
            className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-100"
            data-testid="select-loading-menopause"
          >
            <option value="">—</option><option value="premenopausal">premenopausal</option><option value="perimenopausal">perimenopausal</option><option value="postmenopausal">postmenopausal</option><option value="na">n/a</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <Cb label="On HRT" checked={draft.history?.hormonalStatus?.onHrt} onChange={() => setDraft(d => ({ ...d, history: { ...d.history, hormonalStatus: { ...(d.history?.hormonalStatus ?? {}), onHrt: !d.history?.hormonalStatus?.onHrt } } }))} testId="cb-hrt" />
        <Cb label="Prior injury same site" checked={draft.history?.priorInjurySameSite} onChange={() => setDraft(d => ({ ...d, history: { ...d.history, priorInjurySameSite: !d.history?.priorInjurySameSite } }))} testId="cb-prior-injury" />
        <Cb label="Deconditioned" checked={draft.history?.trainingHistory?.deconditioned} onChange={() => setDraft(d => ({ ...d, history: { ...d.history, trainingHistory: { ...(d.history?.trainingHistory ?? {}), deconditioned: !d.history?.trainingHistory?.deconditioned } } }))} testId="cb-deconditioned" />
      </div>
      <div className="flex items-center justify-end gap-1 pt-1">
        <button onClick={onClose} className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700">Cancel</button>
        <button
          onClick={() => onSave(draft)}
          disabled={saving}
          className="px-2 py-0.5 text-[10px] bg-emerald-900/40 text-emerald-200 border border-emerald-700/40 rounded hover:bg-emerald-900/60 disabled:opacity-50"
          data-testid="button-save-loading-factors"
        >{saving ? 'Saving…' : 'Save & recompute'}</button>
      </div>
    </div>
  );
}

function CustomExerciseCard({
  exercise,
  index,
  dosageScalingData,
  onLoadingOverride,
  onClearLoadingOverride,
}: {
  exercise: CustomExercise;
  index: number;
  dosageScalingData?: DosageScaling | null;
  /** Called when the clinician edits the loading-engine dose for this exercise. */
  onLoadingOverride?: (exerciseId: string, weekIndex: number, partial: Partial<import('@shared/schema').OptimalLoadPrescription>) => void;
  /** Called when the clinician resets the override and lets the engine choose again. */
  onClearLoadingOverride?: (exerciseId: string, weekIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<'diagram' | 'illustration'>('diagram');
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);
  const [illustrationLoading, setIllustrationLoading] = useState(false);
  const [illustrationError, setIllustrationError] = useState<string | null>(null);
  const illustrationRequested = useRef(false);
  // Inline override draft; only submitted to the parent on Save so we don't
  // refetch on every keystroke.
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState<{ sets: string; reps: string; intensityLabel: string; daysPerWeek: string; painCeiling: string }>(
    () => ({
      sets: exercise.optimalLoad ? String(exercise.optimalLoad.sets) : exercise.dosage.sets || '',
      reps: exercise.optimalLoad?.reps ?? exercise.dosage.reps ?? '',
      intensityLabel: exercise.optimalLoad?.intensity.label ?? '',
      daysPerWeek: exercise.optimalLoad ? String(exercise.optimalLoad.daysPerWeek) : '',
      painCeiling: exercise.optimalLoad ? String(exercise.optimalLoad.painCeilingNrs) : '3',
    }),
  );
  const saveOverride = () => {
    if (!exercise.optimalLoad || !exercise.exerciseId || !onLoadingOverride) return;
    onLoadingOverride(exercise.exerciseId, exercise.optimalLoad.weekIndex, {
      sets: parseInt(overrideDraft.sets, 10) || exercise.optimalLoad.sets,
      reps: overrideDraft.reps || exercise.optimalLoad.reps,
      intensity: { ...exercise.optimalLoad.intensity, label: overrideDraft.intensityLabel || exercise.optimalLoad.intensity.label },
      daysPerWeek: parseInt(overrideDraft.daysPerWeek, 10) || exercise.optimalLoad.daysPerWeek,
      painCeilingNrs: parseFloat(overrideDraft.painCeiling) || exercise.optimalLoad.painCeilingNrs,
    });
    setOverrideOpen(false);
  };
  const resetOverride = () => {
    if (!exercise.optimalLoad || !exercise.exerciseId || !onClearLoadingOverride) return;
    onClearLoadingOverride(exercise.exerciseId, exercise.optimalLoad.weekIndex);
    setOverrideOpen(false);
  };

  const scaledCustomDosage = dosageScalingData && exercise.dosage.sets && exercise.dosage.reps
    ? scaleDosage(parseInt(exercise.dosage.sets) || 3, exercise.dosage.reps, dosageScalingData)
    : null;

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
        setVisualMode('diagram');
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
              {scaledCustomDosage ? `${scaledCustomDosage.sets} × ${scaledCustomDosage.reps}` : `${exercise.dosage.sets} × ${exercise.dosage.reps}`}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-800/40 text-cyan-300/70 border border-cyan-700/30">
              {exercise.dosage.tempo}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-800/40 text-cyan-300/70 border border-cyan-700/30 flex items-center gap-0.5">
              <Clock className="h-2 w-2" />
              {exercise.dosage.frequency}
            </span>
            {exercise.optimalLoad && (
              <>
                <span
                  className="px-1.5 py-0.5 rounded bg-emerald-800/40 text-emerald-200 border border-emerald-600/40 flex items-center gap-0.5"
                  title="Loading-engine prescribed intensity"
                  data-testid={`badge-optimal-load-${index}`}
                >
                  <Zap className="h-2 w-2" />
                  {exercise.optimalLoad.intensity.label}
                </span>
                {(() => {
                  const cb = exercise.optimalLoad.confidence;
                  const tone = cb === 'rct_supported' || cb === 'protocol_supported'
                    ? 'bg-emerald-800/30 text-emerald-300 border-emerald-700/30'
                    : cb === 'expert_consensus'
                      ? 'bg-amber-800/30 text-amber-200 border-amber-700/30'
                      : 'bg-rose-800/30 text-rose-200 border-rose-700/30';
                  const label = cb === 'rct_supported'
                    ? 'High (RCT)'
                    : cb === 'protocol_supported'
                      ? 'High (Protocol)'
                      : cb === 'expert_consensus'
                        ? 'Moderate (Consensus)'
                        : 'Low (Extrapolated)';
                  return (
                    <span
                      className={`px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${tone}`}
                      title={`Confidence: ${cb} · Evidence tier: ${exercise.optimalLoad?.evidenceTier}`}
                    >
                      Confidence: {label}
                    </span>
                  );
                })()}
                <span
                  className="px-1.5 py-0.5 rounded bg-rose-900/30 text-rose-200/80 border border-rose-700/30"
                  title="Pain ceiling during loading session"
                >
                  Pain ≤ {exercise.optimalLoad.painCeilingNrs}/10
                </span>
              </>
            )}
            <AddToPlanButton
              size="xs"
              item={{
                id: makeCartId('exercise_custom', exercise.name),
                modality: 'exercise_custom',
                name: exercise.name,
                targetStructure: exercise.targetSystem,
                targetFinding: exercise.clinicalTarget,
                dosage: exercise.optimalLoad
                  ? `${exercise.optimalLoad.sets} × ${exercise.optimalLoad.reps} @ ${exercise.optimalLoad.intensity.label} · ${exercise.dosage.frequency}`
                  : scaledCustomDosage
                    ? `${scaledCustomDosage.sets} × ${scaledCustomDosage.reps} · ${exercise.dosage.frequency}`
                    : `${exercise.dosage.sets} × ${exercise.dosage.reps} · ${exercise.dosage.frequency}`,
                rationale: exercise.biomechanicalRationale,
                contraindications: exercise.contraindications,
              }}
            />
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-cyan-500 shrink-0 mt-1" /> : <ChevronDown className="h-3 w-3 text-cyan-500 shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-cyan-800/30">
          {exercise.optimalLoad && (
            <div
              className="p-2.5 border-b border-cyan-800/20 bg-emerald-950/20"
              data-testid={`section-why-this-dose-${index}`}
            >
              <div className="flex items-center gap-1 mb-1.5">
                <Zap className="h-3 w-3 text-emerald-300" />
                <div className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wide">
                  Why this dose · Wk {exercise.optimalLoad.weekIndex + 1}
                </div>
                <span className="ml-auto text-[8px] text-emerald-300/70 px-1.5 py-0.5 rounded border border-emerald-700/30">
                  Evidence: {exercise.optimalLoad.evidenceTier}
                </span>
                {onLoadingOverride && (
                  <button
                    type="button"
                    onClick={() => setOverrideOpen(o => !o)}
                    className="text-[8px] px-1.5 py-0.5 rounded border border-emerald-700/40 text-emerald-200 hover:bg-emerald-900/40"
                    data-testid={`button-override-load-${index}`}
                  >
                    {overrideOpen ? 'Cancel' : 'Edit dose'}
                  </button>
                )}
              </div>
              {exercise.swapNotice && (
                <div className="text-[9px] text-amber-200 bg-amber-900/20 border border-amber-700/30 rounded px-1.5 py-1 mb-1.5">
                  <span className="font-semibold">Swapped for safety:</span> "{exercise.swapNotice.from}" replaced with "{exercise.name}". {exercise.swapNotice.reason}
                </div>
              )}
              {overrideOpen && (
                <div className="text-[9px] bg-amber-900/20 border border-amber-700/40 rounded p-2 mb-1.5 space-y-1.5" data-testid={`panel-override-${index}`}>
                  <div className="text-amber-200 font-semibold uppercase tracking-wide">Clinician override</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-amber-300/80">Sets</span>
                      <input value={overrideDraft.sets} onChange={e => setOverrideDraft(d => ({ ...d, sets: e.target.value }))} className="bg-gray-900 border border-amber-700/40 rounded px-1 py-0.5 text-amber-100 font-mono" data-testid={`input-override-sets-${index}`} />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-amber-300/80">Reps</span>
                      <input value={overrideDraft.reps} onChange={e => setOverrideDraft(d => ({ ...d, reps: e.target.value }))} className="bg-gray-900 border border-amber-700/40 rounded px-1 py-0.5 text-amber-100 font-mono" data-testid={`input-override-reps-${index}`} />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-amber-300/80">Intensity</span>
                      <input value={overrideDraft.intensityLabel} onChange={e => setOverrideDraft(d => ({ ...d, intensityLabel: e.target.value }))} className="bg-gray-900 border border-amber-700/40 rounded px-1 py-0.5 text-amber-100 font-mono" data-testid={`input-override-intensity-${index}`} />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-amber-300/80">Days/wk</span>
                      <input value={overrideDraft.daysPerWeek} onChange={e => setOverrideDraft(d => ({ ...d, daysPerWeek: e.target.value }))} className="bg-gray-900 border border-amber-700/40 rounded px-1 py-0.5 text-amber-100 font-mono" data-testid={`input-override-days-${index}`} />
                    </label>
                    <label className="flex flex-col gap-0.5 col-span-2">
                      <span className="text-amber-300/80">Pain ceiling (NRS 0–10)</span>
                      <input value={overrideDraft.painCeiling} onChange={e => setOverrideDraft(d => ({ ...d, painCeiling: e.target.value }))} className="bg-gray-900 border border-amber-700/40 rounded px-1 py-0.5 text-amber-100 font-mono" data-testid={`input-override-pain-${index}`} />
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button type="button" onClick={saveOverride} className="px-2 py-0.5 rounded bg-amber-600/40 text-amber-100 border border-amber-500/50 hover:bg-amber-600/60" data-testid={`button-save-override-${index}`}>
                      Save & recompute
                    </button>
                    {exercise.optimalLoad?.isOverride && onClearLoadingOverride && (
                      <button type="button" onClick={resetOverride} className="px-2 py-0.5 rounded bg-gray-700/40 text-gray-200 border border-gray-600/50 hover:bg-gray-700/60" data-testid={`button-reset-override-${index}`}>
                        Reset to engine default
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5 text-[9px] mb-1.5">
                <div className="flex justify-between bg-emerald-900/20 px-1.5 py-1 rounded border border-emerald-800/30">
                  <span className="text-emerald-300/70">Sets × Reps</span>
                  <span className="text-emerald-100 font-mono">{exercise.optimalLoad.sets} × {exercise.optimalLoad.reps}</span>
                </div>
                <div className="flex justify-between bg-emerald-900/20 px-1.5 py-1 rounded border border-emerald-800/30">
                  <span className="text-emerald-300/70">Intensity</span>
                  <span className="text-emerald-100 font-mono">{exercise.optimalLoad.intensity.label}</span>
                </div>
                <div className="flex justify-between bg-emerald-900/20 px-1.5 py-1 rounded border border-emerald-800/30">
                  <span className="text-emerald-300/70">Tempo (E-I-C)</span>
                  <span className="text-emerald-100 font-mono">
                    {exercise.optimalLoad.tempo.eccentricSec}-{exercise.optimalLoad.tempo.isometricSec}-{exercise.optimalLoad.tempo.concentricSec}s
                  </span>
                </div>
                <div className="flex justify-between bg-emerald-900/20 px-1.5 py-1 rounded border border-emerald-800/30">
                  <span className="text-emerald-300/70">Frequency</span>
                  <span className="text-emerald-100 font-mono">
                    {exercise.optimalLoad.daysPerWeek}×/wk
                    {exercise.optimalLoad.frequencyPerDay && exercise.optimalLoad.frequencyPerDay > 1 ? ` × ${exercise.optimalLoad.frequencyPerDay}/d` : ''}
                  </span>
                </div>
              </div>
              {exercise.optimalLoad.factorContributions && exercise.optimalLoad.factorContributions.length > 0 && (
                <div className="space-y-0.5 mb-1.5">
                  <div className="text-[9px] text-emerald-300/70 uppercase tracking-wide">Factor adjustments</div>
                  {exercise.optimalLoad.factorContributions.map((fc, i) => {
                    const isReduce = /−|-|reduc|lower|caut/i.test(fc.effect);
                    return (
                      <div key={i} className="flex items-start gap-1.5 text-[9px] bg-emerald-900/10 px-1.5 py-1 rounded border border-emerald-800/20">
                        <span className={`shrink-0 max-w-[80px] truncate text-right font-mono ${isReduce ? 'text-amber-300' : 'text-emerald-300'}`} title={fc.effect}>
                          {fc.effect}
                        </span>
                        <span className="text-emerald-100/90 leading-snug">
                          <span className="font-semibold">{fc.factor}:</span> {fc.rationale}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {exercise.optimalLoad.rationale && (
                <div className="text-[9px] text-emerald-100/80 leading-snug bg-emerald-900/10 px-1.5 py-1 rounded border border-emerald-800/20 mb-1.5">
                  {exercise.optimalLoad.rationale}
                </div>
              )}
              {exercise.optimalLoad.isOverride && (
                <div className="text-[8px] text-amber-300 mb-1 italic">
                  Clinician override applied — automatic recompute paused for this line.
                </div>
              )}
              {exercise.loadingProjection && exercise.loadingProjection.length > 0 && (
                <div>
                  <div className="text-[9px] text-emerald-300/70 uppercase tracking-wide mb-0.5">8–12 wk projection</div>
                  <div className="flex flex-wrap gap-1">
                    {exercise.loadingProjection.slice(0, 12).map((p, i) => (
                      <span
                        key={i}
                        className="text-[8px] px-1 py-0.5 rounded bg-emerald-900/30 text-emerald-200/80 border border-emerald-800/30 font-mono"
                        title={`Week ${p.weekIndex + 1} · ${p.sets}×${p.reps} · ${p.intensity.label}`}
                      >
                        W{p.weekIndex + 1}: {p.intensity.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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

export default function ExerciseEngineTab({ mechanismAnalysis, slingAnalysis, painMarkers, slingDrivenRecommendations, onCustomExerciseResult, goalProfile, clinicalState, goalGap, sessionPrescription, sessionPrescriptionNum, pendingGenerate, onGenerateStarted, onGenerateComplete, conditionName, loadingPatientFactors }: ExerciseEngineTabProps) {
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
  const [showRecoveryContext, setShowRecoveryContext] = useState(true);
  // Loading-engine clinician overrides (Task #231).
  // Backed by the server-side loadingContextStore so overrides persist
  // across recomputes, page reloads, and devices for the same clinician.
  type LoadingOverridePartial = Partial<import('@shared/schema').OptimalLoadPrescription> & { exerciseId: string; weekIndex: number };
  type LoadingContextResponse = {
    patientFactors?: import('@shared/schema').LoadingPatientFactors;
    overrides: LoadingOverridePartial[];
    updatedAt?: number;
  };
  const loadingContextKey = useMemo(
    () => ['/api/loading-context', conditionName ?? '__none__', sessionPrescriptionNum ?? 0] as const,
    [conditionName, sessionPrescriptionNum],
  );
  const loadingContextQuery = useQuery<LoadingContextResponse>({
    queryKey: loadingContextKey,
    enabled: !!conditionName,
    queryFn: async () => {
      if (!conditionName) return { overrides: [] };
      const url = `/api/loading-context/${encodeURIComponent(conditionName)}?sessionPrescriptionNum=${sessionPrescriptionNum ?? 0}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load loading context: ${res.status}`);
      return res.json();
    },
  });
  const loadingOverrides = useMemo<Record<string, LoadingOverridePartial>>(() => {
    const map: Record<string, LoadingOverridePartial> = {};
    for (const o of loadingContextQuery.data?.overrides ?? []) {
      map[`${o.exerciseId}::w${o.weekIndex}`] = o;
    }
    return map;
  }, [loadingContextQuery.data]);
  // Server-side patient factors take precedence; the parent-supplied
  // factors prefill the editor on first load if the store is empty.
  const persistedFactors = loadingContextQuery.data?.patientFactors;
  const effectivePatientFactors = persistedFactors ?? loadingPatientFactors;
  const upsertOverrideMutation = useMutation({
    mutationFn: async (override: LoadingOverridePartial) => {
      if (!conditionName) return;
      await apiRequest(
        `/api/loading-context/${encodeURIComponent(conditionName)}/overrides`,
        'PUT',
        { sessionPrescriptionNum: sessionPrescriptionNum ?? undefined, override },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadingContextKey }),
  });
  const deleteOverrideMutation = useMutation({
    mutationFn: async (args: { exerciseId: string; weekIndex: number }) => {
      if (!conditionName) return;
      const url = `/api/loading-context/${encodeURIComponent(conditionName)}/overrides/${encodeURIComponent(args.exerciseId)}/${args.weekIndex}?sessionPrescriptionNum=${sessionPrescriptionNum ?? 0}`;
      const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to delete override: ${res.status}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadingContextKey }),
  });
  const savePatientFactorsMutation = useMutation({
    mutationFn: async (patientFactors: import('@shared/schema').LoadingPatientFactors) => {
      if (!conditionName) return;
      await apiRequest(
        `/api/loading-context/${encodeURIComponent(conditionName)}`,
        'PUT',
        { sessionPrescriptionNum: sessionPrescriptionNum ?? undefined, patientFactors },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadingContextKey }),
  });
  const upsertLoadingOverride = useCallback((exerciseId: string, weekIndex: number, partial: Partial<import('@shared/schema').OptimalLoadPrescription>) => {
    upsertOverrideMutation.mutate({ exerciseId, weekIndex, ...partial });
  }, [upsertOverrideMutation]);
  const clearLoadingOverride = useCallback((exerciseId: string, weekIndex: number) => {
    deleteOverrideMutation.mutate({ exerciseId, weekIndex });
  }, [deleteOverrideMutation]);
  // Track the previous loading plan so we can show a diff after each
  // recompute ("X exercises changed dose · why").
  const [recomputeDiff, setRecomputeDiff] = useState<import('@shared/schema').LoadingPlanDiff | null>(null);
  // Manual "Recalculate now" trigger — bumps a counter that is included in
  // the recompute signature so the engine handshake re-runs on demand.
  const [manualRecomputeTick, setManualRecomputeTick] = useState(0);
  const recomputeNow = useCallback(() => setManualRecomputeTick(t => t + 1), []);
  // Inline structured patient-factors editor state.
  const [factorsEditorOpen, setFactorsEditorOpen] = useState(false);

  const activePrescription = sessionPrescription ?? null;

  const prescriptionCtx = useMemo<PrescriptionContext | null>(() => {
    if (!goalProfile || !clinicalState) return null;
    return buildPrescriptionContext(goalProfile, clinicalState, goalGap ?? null, null);
  }, [goalProfile, clinicalState, goalGap]);

  const effectiveCtx = activePrescription ?? prescriptionCtx;

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

    const ctx = effectiveCtx;
    if (ctx) {
      payload.recoveryGoalContext = {
        condition: ctx.conditionName,
        phaseLabel: ctx.phaseLabel,
        goalAchievementPct: Math.round(ctx.goalAchievementPct),
        painCurrent: Math.round(ctx.currentPain),
        painTarget: ctx.painTarget,
        dosageIntensity: ctx.dosageScaling.intensityLabel,
        painCeiling: ctx.dosageScaling.painCeiling,
        priorityBodyParts: ctx.priorityBodyParts,
        contraindications: ctx.contraindications,
        topGaps: ctx.goalGaps.slice(0, 5).map(g => ({
          label: g.label,
          gapPercent: Math.round(g.gapPercent),
          priority: g.priority,
          categories: g.recommendedCategories,
        })),
      };
    }

    return payload;
  }, [mechanismAnalysis, slingAnalysis, painMarkers, effectiveCtx]);

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
      onGenerateComplete?.(true);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      onGenerateComplete?.(false);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [buildPayload, onGenerateComplete]);

  useEffect(() => {
    if (pendingGenerate) {
      onGenerateStarted?.();
      generatePlan();
    }
  }, [pendingGenerate, generatePlan, onGenerateStarted]);

  const designCustomExercises = useCallback(async () => {
    if (customAbortRef.current) customAbortRef.current.abort();
    const controller = new AbortController();
    customAbortRef.current = controller;

    setCustomLoading(true);
    setCustomError(null);

    try {
      const payload = buildPayload() as Record<string, unknown>;
      if (targetFocus) {
        (payload as { targetFocus?: string }).targetFocus = targetFocus;
      }
      if (conditionName) payload.conditionName = conditionName;
      if (effectivePatientFactors) payload.loadingPatientFactors = effectivePatientFactors;
      const overrideList = Object.values(loadingOverrides);
      if (overrideList.length > 0) payload.loadingOverrides = overrideList;
      const result = await apiRequest('/api/exercise-engine/design-custom', 'POST', payload) as CustomExerciseResult;
      if (controller.signal.aborted) return;
      // Server is the single source of truth for the recompute diff
      // (Task #231): consume `result.loadingDiff` rather than recomputing
      // a parallel diff client-side, so reasons stay consistent across the
      // PlanTab, ExerciseEngineTab, and any downstream consumers.
      setRecomputeDiff(result.loadingDiff && result.loadingDiff.changes.length > 0 ? result.loadingDiff : null);
      setCustomResult(result);
      onCustomExerciseResult?.(result);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setCustomError(msg);
    } finally {
      if (!controller.signal.aborted) setCustomLoading(false);
    }
  }, [buildPayload, targetFocus, conditionName, effectivePatientFactors, loadingOverrides, onCustomExerciseResult]);

  // Auto-recompute when overrides OR loading-engine inputs change OR
  // the clinician hits "Recalculate now". Only fires after the first
  // explicit generation so the tab doesn't self-fetch on mount.
  const recomputeSig = useMemo(() => {
    const ovrPart = Object.keys(loadingOverrides).sort().map(k => `${k}=${JSON.stringify(loadingOverrides[k])}`).join('|');
    const factorPart = JSON.stringify({ c: conditionName ?? null, f: effectivePatientFactors ?? null });
    return `ovr:${ovrPart}::ctx:${factorPart}::tick:${manualRecomputeTick}`;
  }, [loadingOverrides, conditionName, effectivePatientFactors, manualRecomputeTick]);
  const lastSentRecomputeSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (!customResult) { lastSentRecomputeSigRef.current = recomputeSig; return; }
    if (lastSentRecomputeSigRef.current === recomputeSig) return;
    lastSentRecomputeSigRef.current = recomputeSig;
    designCustomExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recomputeSig]);

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
                <div className="flex items-center gap-1">
                  {conditionName && (
                    <>
                      <button
                        onClick={() => setFactorsEditorOpen(o => !o)}
                        className="px-2 py-1 text-[9px] bg-slate-800/40 text-slate-300 border border-slate-600/30 rounded hover:bg-slate-800/70 transition-colors flex items-center gap-1"
                        data-testid="button-loading-factors-editor"
                      >
                        <Activity className="h-2.5 w-2.5" />
                        Loading factors
                      </button>
                      <button
                        onClick={recomputeNow}
                        disabled={customLoading}
                        className="px-2 py-1 text-[9px] bg-amber-900/30 text-amber-300 border border-amber-700/30 rounded hover:bg-amber-900/50 transition-colors flex items-center gap-1 disabled:opacity-50"
                        data-testid="button-loading-recalculate-now"
                      >
                        <Zap className="h-2.5 w-2.5" />
                        Recalculate now
                      </button>
                    </>
                  )}
                  <button
                    onClick={designCustomExercises}
                    disabled={customLoading}
                    className="px-2 py-1 text-[9px] bg-cyan-900/30 text-cyan-400 border border-cyan-700/30 rounded hover:bg-cyan-900/50 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    Redesign
                  </button>
                </div>
              </div>
              {factorsEditorOpen && conditionName && (
                <LoadingFactorsEditor
                  initial={effectivePatientFactors}
                  saving={savePatientFactorsMutation.isPending}
                  onSave={(pf) => {
                    savePatientFactorsMutation.mutate(pf);
                    setFactorsEditorOpen(false);
                  }}
                  onClose={() => setFactorsEditorOpen(false)}
                />
              )}
              {customResult.loadingEngine && !customResult.loadingEngine.applicable && customResult.loadingEngine.reason && (
                <div
                  className="flex items-start gap-1.5 text-[10px] bg-slate-900/40 border border-slate-700/40 rounded px-2 py-1.5 text-slate-200"
                  data-testid="banner-loading-engine-not-applicable"
                >
                  <Shield className="h-3 w-3 text-slate-300 mt-0.5 shrink-0" />
                  <span>{customResult.loadingEngine.reason}</span>
                </div>
              )}
              {customResult.loadingEngine?.applicable && (
                <div
                  className="flex items-center gap-1.5 text-[10px] bg-emerald-950/30 border border-emerald-700/30 rounded px-2 py-1 text-emerald-200"
                  data-testid="banner-loading-engine-active"
                >
                  <Zap className="h-3 w-3 text-emerald-300" />
                  <span>
                    Optimal Loading Engine active{customResult.loadingEngine.site ? ` · ${customResult.loadingEngine.site.replace(/_/g, ' ')} tendinopathy` : ''} — doses below are evidence-graded.
                  </span>
                </div>
              )}
              {recomputeDiff && recomputeDiff.changes.length > 0 && (
                <div
                  className="flex items-start gap-1.5 text-[10px] bg-amber-950/30 border border-amber-700/40 rounded px-2 py-1.5 text-amber-200"
                  data-testid="banner-loading-recompute-diff"
                >
                  <Zap className="h-3 w-3 text-amber-300 mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-1 w-full">
                    <span className="font-medium">
                      Recomputed: {recomputeDiff.changes.length} {recomputeDiff.changes.length === 1 ? 'change' : 'changes'} · {recomputeDiff.triggerReason}
                    </span>
                    <ul className="space-y-1 text-amber-100/90 max-h-40 overflow-y-auto">
                      {recomputeDiff.changes.slice(0, 8).map((c, idx) => (
                        <li key={idx} className="leading-snug">
                          <span className="font-semibold text-amber-100">{c.exerciseName}</span>
                          <span className="text-amber-300/80"> · wk {c.weekIndex + 1} · {c.field}</span>:{' '}
                          <span className="text-amber-200/80 line-through">{c.before}</span>{' → '}
                          <span className="text-amber-100">{c.after}</span>
                          <span className="block text-amber-200/70 italic">why: {c.reason}</span>
                        </li>
                      ))}
                      {recomputeDiff.changes.length > 8 && (
                        <li className="text-amber-300/70 italic">+{recomputeDiff.changes.length - 8} more changes</li>
                      )}
                    </ul>
                    <button
                      type="button"
                      className="self-start text-amber-300 hover:text-amber-100 underline mt-0.5"
                      onClick={() => setRecomputeDiff(null)}
                      data-testid="button-dismiss-recompute-diff"
                    >Dismiss</button>
                  </div>
                </div>
              )}

              {customResult.customExercises.map((ex, i) => (
                <CustomExerciseCard
                  key={i}
                  exercise={ex}
                  index={i}
                  dosageScalingData={effectiveCtx?.dosageScaling}
                  onLoadingOverride={upsertLoadingOverride}
                  onClearLoadingOverride={clearLoadingOverride}
                />
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
      {activePrescription && sessionPrescriptionNum !== null && sessionPrescriptionNum !== undefined && (
        <div className="border border-violet-500/40 rounded bg-violet-950/30 px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-violet-400" />
            <span className="text-[9px] font-medium text-violet-300">
              Driven by Session {sessionPrescriptionNum}
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {activePrescription.phaseLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-violet-400">{activePrescription.dosageScaling.intensityLabel}</span>
            <span className="text-[8px] text-gray-500">|</span>
            <span className="text-[8px] text-violet-400">{Math.round(activePrescription.goalAchievementPct)}% achieved</span>
          </div>
        </div>
      )}
      {effectiveCtx && showRecoveryContext && (
        <div className="border border-emerald-500/30 rounded-lg bg-gradient-to-br from-emerald-950/30 to-gray-900/60 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-300">Recovery Goal Context</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {Math.round(effectiveCtx.goalAchievementPct)}% achieved
              </span>
            </div>
            <button onClick={() => setShowRecoveryContext(false)} className="text-gray-500 hover:text-gray-300">
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-gray-800/50 rounded p-1.5 text-center">
              <div className="text-[8px] text-gray-400">Phase</div>
              <div className="text-[9px] font-medium text-gray-200 truncate">{effectiveCtx.phaseLabel.replace('Phase ', 'P').split(' — ')[0]}</div>
            </div>
            <div className="bg-gray-800/50 rounded p-1.5 text-center">
              <div className="text-[8px] text-gray-400">Pain</div>
              <div className="text-[9px] font-medium text-gray-200">{Math.round(effectiveCtx.currentPain)} → {effectiveCtx.painTarget}</div>
            </div>
            <div className="bg-gray-800/50 rounded p-1.5 text-center">
              <div className="text-[8px] text-gray-400">Dosage</div>
              <div className="text-[9px] font-medium text-gray-200 capitalize">{effectiveCtx.dosageScaling.intensityLabel}</div>
            </div>
          </div>
          {effectiveCtx.goalGaps.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[8px] text-gray-400 uppercase tracking-wider">Priority Gaps</div>
              {effectiveCtx.goalGaps.slice(0, 3).map(gap => (
                <div key={gap.dimension} className="flex items-center gap-1.5 text-[9px]">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${gap.priority === 'high' ? 'bg-red-400' : gap.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-400'}`} />
                  <span className="text-gray-300 truncate flex-1">{gap.label}</span>
                  <span className="text-gray-500">{Math.round(gap.gapPercent)}%</span>
                  <span className="text-[7px] text-gray-500">{gap.trend === 'improving' ? '↑' : gap.trend === 'worsening' ? '↓' : '→'}</span>
                </div>
              ))}
            </div>
          )}
          {effectiveCtx.contraindications.length > 0 && (
            <div className="flex items-start gap-1 bg-red-950/30 rounded p-1.5 border border-red-500/20">
              <AlertTriangle className="h-2.5 w-2.5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-[8px] text-red-300/80 leading-relaxed">
                {effectiveCtx.contraindications.join(' · ')}
              </div>
            </div>
          )}
        </div>
      )}
      {effectiveCtx && !showRecoveryContext && (
        <button onClick={() => setShowRecoveryContext(true)} className="flex items-center gap-1 text-[9px] text-emerald-400/60 hover:text-emerald-400 transition-colors">
          <Target className="h-2.5 w-2.5" />
          Show Recovery Context ({Math.round(effectiveCtx.goalAchievementPct)}%)
        </button>
      )}
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
            {isExpanded && (() => {
              const ctxForFilter = effectiveCtx;
              const filteredRaw = ctxForFilter && ctxForFilter.contraindications.length > 0
                ? group.exercises.filter(ex =>
                    !ctxForFilter.contraindications.some(c =>
                      ex.name.toLowerCase().includes(c.toLowerCase()) ||
                      (ex.contraindications && ex.contraindications.toLowerCase().includes(c.toLowerCase()))
                    ))
                : group.exercises;
              const excluded = group.exercises.length - filteredRaw.length;
              // Annotate with sling-driven matches (Task #235) and reorder so
              // restore items rank above calm-compensatory ones.
              const annotated = filteredRaw.map(ex => ({
                ex,
                slingMatch: matchRecommendationsForItem(
                  ex.name,
                  ex.targetStructure,
                  slingDrivenRecommendations ?? [],
                  'exercise',
                ),
              }));
              const filtered = sortByDriverRole(annotated, a => a.slingMatch?.role);
              return (
                <div className="p-2 space-y-1.5">
                  {excluded > 0 && (
                    <div className="flex items-center gap-1 px-1 py-0.5 bg-red-900/20 border border-red-500/20 rounded text-[7px] text-red-400">
                      <AlertTriangle className="h-2 w-2 shrink-0" />
                      {excluded} exercise{excluded > 1 ? 's' : ''} excluded (contraindicated)
                    </div>
                  )}
                  {filtered.map(({ ex, slingMatch }, i) => {
                    const matchingGap = ctxForFilter?.goalGaps.find(g =>
                      ex.targetStructure?.toLowerCase().includes(g.label.toLowerCase()) ||
                      ex.targetFinding?.toLowerCase().includes(g.label.toLowerCase())
                    );
                    return (
                      <div key={`${group.groupId}-${i}`}>
                        {matchingGap && (
                          <div className="flex items-center gap-1 mb-0.5 px-2 pt-1">
                            <Target className="h-2 w-2 text-emerald-400" />
                            <span className="text-[7px] text-emerald-400">
                              Goal: {matchingGap.label} ({matchingGap.current.toFixed(0)}→{matchingGap.target.toFixed(0)})
                            </span>
                          </div>
                        )}
                        <ExerciseCard exercise={ex} index={i} dosageScalingData={effectiveCtx?.dosageScaling} slingMatch={slingMatch} />
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
