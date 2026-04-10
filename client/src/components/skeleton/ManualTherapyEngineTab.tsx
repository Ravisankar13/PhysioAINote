import { useState, useCallback, useRef, useEffect } from 'react';
import { Hand, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Target, TrendingUp, Shield, Loader2, Zap, Activity, Sparkles, ArrowRight, Clock, ShieldAlert, Crosshair, Home, MessageSquare, Send, RotateCcw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { InjuryMechanismResult } from '@/lib/injuryMechanismEngine';
import type { SlingAnalysisResult } from '@/lib/slingEngine';
import type { ScarMarker, AdhesionBand } from '@/lib/scarTissueMapping';

interface TechniqueItem {
  technique: string;
  targetStructure: string;
  targetFinding: string;
  patientPosition: string;
  dosage: string;
  rationale: string;
  contraindications: string;
  expectedOutcome: string;
  reassessmentCriteria: string;
}

interface TechniqueGroup {
  groupId: string;
  goalTitle: string;
  goalDescription: string;
  priority: number;
  techniques: TechniqueItem[];
}

interface ManualTherapyPlan {
  techniqueGroups: TechniqueGroup[];
  clinicalNotes: string;
  irritabilityConsiderations: string;
}

interface PainMarkerInput {
  label: string;
  severity?: number;
  type?: string;
}

interface ForceApplicationStep {
  order: number;
  action: string;
  direction: string;
  depth: string;
  rhythm: string;
  grade: string;
  tissueResponseCue: string;
}

interface ProgressionStage {
  stage: number;
  name: string;
  description: string;
}

interface TissueTarget {
  tissueName: string;
  goalType: 'release' | 'mobilize' | 'activate' | 'stabilize' | 'decompress';
  goalText: string;
}

interface CustomTechnique {
  name: string;
  targetSystem: string;
  clinicalTarget: string;
  patientPositioning: string;
  handPlacementSteps: string[];
  forceApplicationSequence: ForceApplicationStep[];
  tissueResponseCues: string[];
  biomechanicalRationale: string;
  dosage: { duration: string; repetitions: string; sets: string; frequency: string };
  safetyCues: string[];
  contraindications: string;
  progressionStages: ProgressionStage[];
  selfTreatmentAdaptation: string;
  tissueTargets?: TissueTarget[];
}

interface CustomManualTherapyResult {
  customTechniques: CustomTechnique[];
  designRationale: string;
  safetyNotes: string;
}

interface MusclePathologyInput {
  muscleId: string;
  label: string;
  pathology: string;
  severity: string;
}

interface ManualTherapyEngineTabProps {
  mechanismAnalysis: InjuryMechanismResult | null;
  slingAnalysis: SlingAnalysisResult | null;
  painMarkers: PainMarkerInput[];
  scarMarkers?: ScarMarker[];
  adhesionBands?: AdhesionBand[];
  musclePathologies?: MusclePathologyInput[];
  onHighlightMuscles?: (muscles: string[]) => void;
  onSetMuscleHighlightColors?: (colors: Record<string, string>) => void;
  onSetManualTherapyAnnotations?: (annotations: TissueTarget[] | null) => void;
}

const TISSUE_NAME_TO_MUSCLE_GROUP: Record<string, string[]> = {
  'quadratus_lumborum': ['core'],
  'rectus_abdominis': ['core'],
  'rectus_abdominus': ['core'],
  'external_obliques': ['core'],
  'internal_obliques': ['core'],
  'transverse_abdominis': ['core'],
  'multifidus': ['spine', 'core'],
  'erector_spinae': ['spine', 'core'],
  'thoracolumbar_fascia': ['spine', 'core'],
  'gluteus_maximus': ['glute_r', 'glute_l'],
  'gluteus_medius': ['glute_r', 'glute_l'],
  'gluteus_minimus': ['glute_r', 'glute_l'],
  'piriformis': ['glute_r', 'glute_l'],
  'obturator_externus': ['glute_r', 'glute_l'],
  'quadratus_femoris': ['glute_r', 'glute_l'],
  'psoas': ['core', 'quad_r', 'quad_l'],
  'iliacus': ['core', 'quad_r', 'quad_l'],
  'hip_flexor': ['core', 'quad_r', 'quad_l'],
  'rectus_femoris': ['quad_r', 'quad_l'],
  'vastus_lateralis': ['quad_r', 'quad_l'],
  'vastus_medialis': ['quad_r', 'quad_l'],
  'biceps_femoris': ['quad_r', 'quad_l'],
  'semitendinosus': ['quad_r', 'quad_l'],
  'semimembranosus': ['quad_r', 'quad_l'],
  'hamstring': ['quad_r', 'quad_l'],
  'adductor': ['quad_r', 'quad_l'],
  'tensor_fasciae_latae': ['glute_r', 'glute_l', 'quad_r', 'quad_l'],
  'iliotibial_band': ['glute_r', 'glute_l', 'quad_r', 'quad_l'],
  'gastrocnemius': ['calf_r', 'calf_l'],
  'soleus': ['calf_r', 'calf_l'],
  'tibialis_anterior': ['shin_r', 'shin_l'],
  'tibialis_posterior': ['shin_r', 'shin_l'],
  'peroneal': ['shin_r', 'shin_l'],
  'plantar_fascia': ['foot_r', 'foot_l'],
  'pectoralis_major': ['chest'],
  'pectoralis_minor': ['chest'],
  'latissimus_dorsi': ['spine', 'scapula_r', 'scapula_l'],
  'trapezius': ['spine', 'scapula_r', 'scapula_l'],
  'trapezius_upper': ['neck'],
  'trapezius_lower': ['spine'],
  'rhomboid': ['scapula_r', 'scapula_l'],
  'deltoid': ['deltoid_r', 'deltoid_l'],
  'infraspinatus': ['scapula_r', 'scapula_l'],
  'supraspinatus': ['scapula_r', 'scapula_l'],
  'subscapularis': ['scapula_r', 'scapula_l'],
  'teres_major': ['scapula_r', 'scapula_l'],
  'teres_minor': ['scapula_r', 'scapula_l'],
  'levator_scapulae': ['neck', 'scapula_r', 'scapula_l'],
  'sternocleidomastoid': ['neck'],
  'scalene': ['neck'],
  'diaphragm': ['core', 'chest'],
  'biceps': ['bicep_r', 'bicep_l'],
  'triceps': ['bicep_r', 'bicep_l'],
  'serratus_anterior': ['chest', 'scapula_r', 'scapula_l'],
};

const GOAL_TYPE_COLORS: Record<string, string> = {
  'release': '#f97316',
  'mobilize': '#3b82f6',
  'activate': '#22c55e',
  'stabilize': '#a855f7',
  'decompress': '#06b6d4',
};

export type { TissueTarget };

const MT_FOCUS_PRESETS = [
  { label: 'Fascial Release', value: 'fascial release and myofascial continuity' },
  { label: 'Myofascial Trigger Points', value: 'myofascial trigger point release' },
  { label: 'Scar / Adhesion Release', value: 'scar tissue mobilization and adhesion release across tissue layers' },
  { label: 'Joint Mobilization', value: 'joint mobilization and arthrokinematics' },
  { label: 'Neural Mobilization', value: 'neural mobilization and neurodynamics' },
  { label: 'Visceral Mobilization', value: 'visceral mobilization and organ motility' },
  { label: 'Thoracolumbar Fascia', value: 'thoracolumbar fascia and posterior chain' },
  { label: 'Posterior Oblique Sling', value: 'posterior oblique sling fascial continuity' },
  { label: 'Deep Front Line', value: 'deep front line and core fascial system' },
];

const GROUP_ICONS: Record<string, typeof Hand> = {
  'Restore Joint Mobility': Zap,
  'Release Overloaded Tissues': Activity,
  'Neural Mobilization': TrendingUp,
  'Facilitate Inhibited Muscles': Target,
  'Address Fascial Restrictions': Shield,
};

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  'Restore Joint Mobility': { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-300', badge: 'bg-rose-500/20 text-rose-300' },
  'Release Overloaded Tissues': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300', badge: 'bg-orange-500/20 text-orange-300' },
  'Neural Mobilization': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', badge: 'bg-cyan-500/20 text-cyan-300' },
  'Facilitate Inhibited Muscles': { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
  'Address Fascial Restrictions': { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300' },
};

const DEFAULT_COLORS = { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-300', badge: 'bg-rose-500/20 text-rose-300' };

const REFINEMENT_PRESETS = [
  { label: 'Make gentler', value: 'Make all techniques gentler — reduce force grades, use slower rhythms, and prioritize patient comfort for an acute or irritable presentation.' },
  { label: 'Avoid prone', value: 'Modify all techniques to avoid prone positioning. Use supine, sidelying, or seated alternatives instead.' },
  { label: 'Add neural technique', value: 'Add a neurodynamic mobilization technique targeting the neural structures most relevant to this dysfunction pattern.' },
  { label: 'Increase dosage', value: 'Increase the dosage parameters for all techniques — longer hold durations, more repetitions, and higher frequency.' },
  { label: 'Add home exercise', value: 'Enhance the self-treatment adaptations — provide more detailed, specific home exercise alternatives the patient can do independently.' },
  { label: 'More hands-on detail', value: 'Add more specific hand placement and force application detail to each technique — exact finger/palm contact points, pressure angles, and tissue response landmarks.' },
  { label: 'Progress to active', value: 'Progress all techniques to include active patient participation — combine manual therapy with active movement integration.' },
];

function CustomTechniqueCard({ technique, index, isSelected, onSelect }: { technique: CustomTechnique; index: number; isSelected?: boolean; onSelect?: (index: number, expanded: boolean) => void }) {
  const expanded = isSelected ?? false;
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  const handleToggle = () => {
    onSelect?.(index, !expanded);
  };

  return (
    <div className={`border rounded-lg bg-gradient-to-br from-cyan-950/30 to-gray-900/80 overflow-hidden ${isSelected ? 'border-cyan-400/60 ring-1 ring-cyan-400/20' : 'border-cyan-500/30'}`}>
      <button
        onClick={handleToggle}
        className="w-full flex items-start gap-2 p-2.5 text-left hover:bg-cyan-900/10 transition-colors"
      >
        <span className="text-[10px] font-mono text-cyan-500/70 mt-0.5 min-w-[16px]">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="text-[11px] font-semibold text-cyan-200">{technique.name}</div>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5 shrink-0">
              <Sparkles className="h-2 w-2" />
              AI-Designed
            </span>
          </div>
          <div className="text-[9px] text-cyan-400/70 mt-0.5 flex items-center gap-1">
            <Crosshair className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{technique.targetSystem}</span>
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5 truncate">{technique.clinicalTarget}</div>
          <div className="flex gap-2 mt-1.5 text-[9px] flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-cyan-800/40 text-cyan-300 border border-cyan-700/30">
              {technique.dosage.sets} sets × {technique.dosage.repetitions}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-800/40 text-cyan-300/70 border border-cyan-700/30">
              {technique.dosage.duration}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-800/40 text-cyan-300/70 border border-cyan-700/30 flex items-center gap-0.5">
              <Clock className="h-2 w-2" />
              {technique.dosage.frequency}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-cyan-500 shrink-0 mt-1" /> : <ChevronDown className="h-3 w-3 text-cyan-500 shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-cyan-800/30">
          <div className="flex flex-wrap gap-0.5 p-1.5 bg-gray-900/50">
            {['positioning', 'handPlacement', 'forceApplication', 'tissueResponse', 'rationale', 'safety', 'progression', 'selfTreatment'].map(section => (
              <button
                key={section}
                onClick={() => toggleSection(section)}
                className={`px-2 py-1 text-[9px] rounded transition-colors ${activeSection === section ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'}`}
              >
                {section === 'positioning' && 'Patient Position'}
                {section === 'handPlacement' && 'Hand Placement'}
                {section === 'forceApplication' && 'Force Application'}
                {section === 'tissueResponse' && 'Tissue Response'}
                {section === 'rationale' && 'Rationale'}
                {section === 'safety' && 'Safety'}
                {section === 'progression' && 'Progression'}
                {section === 'selfTreatment' && 'Self-Treatment'}
              </button>
            ))}
          </div>

          <div className="p-2.5 space-y-2">
            {activeSection === 'positioning' && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1">Patient Positioning</div>
                <div className="text-[10px] text-gray-300 leading-relaxed bg-gray-800/50 rounded p-2 border border-gray-700/30">{technique.patientPositioning}</div>
              </div>
            )}

            {activeSection === 'handPlacement' && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Hand className="h-2.5 w-2.5" />
                  Hand Placement & Contact
                </div>
                <div className="space-y-1">
                  {technique.handPlacementSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px]">
                      <ArrowRight className="h-2.5 w-2.5 text-cyan-500 shrink-0 mt-0.5" />
                      <span className="text-gray-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'forceApplication' && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Force Application Sequence
                </div>
                <div className="space-y-1.5">
                  {[...technique.forceApplicationSequence].sort((a, b) => a.order - b.order).map((step) => (
                    <div key={step.order} className="flex items-start gap-2 bg-gray-800/40 rounded p-1.5 border border-gray-700/20">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="text-[9px] font-mono text-cyan-500 bg-cyan-900/30 rounded-full w-5 h-5 flex items-center justify-center">{step.order}</span>
                        {step.order < technique.forceApplicationSequence.length && (
                          <div className="w-px h-3 bg-cyan-800/40 mt-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-gray-200">{step.action}</div>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <div className="text-[8px]"><span className="text-gray-500 uppercase">Direction:</span> <span className="text-cyan-300/80">{step.direction}</span></div>
                          <div className="text-[8px]"><span className="text-gray-500 uppercase">Depth:</span> <span className="text-cyan-300/80">{step.depth}</span></div>
                          <div className="text-[8px]"><span className="text-gray-500 uppercase">Rhythm:</span> <span className="text-cyan-300/80">{step.rhythm}</span></div>
                          <div className="text-[8px]"><span className="text-gray-500 uppercase">Grade:</span> <span className="text-cyan-300/80">{step.grade}</span></div>
                        </div>
                        <div className="text-[9px] text-cyan-400/70 mt-1 italic">Feel: "{step.tissueResponseCue}"</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'tissueResponse' && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Activity className="h-2.5 w-2.5" />
                  Tissue Response Cues
                </div>
                <div className="space-y-1">
                  {technique.tissueResponseCues.map((cue, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px]">
                      <span className="text-[9px] font-mono text-cyan-500 bg-cyan-900/30 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-gray-300 italic">{cue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'rationale' && (
              <div>
                <div className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider mb-1">Biomechanical Rationale</div>
                <div className="text-[10px] text-gray-300 leading-relaxed">{technique.biomechanicalRationale}</div>
              </div>
            )}

            {activeSection === 'safety' && (
              <div className="space-y-2">
                {technique.safetyCues.length > 0 && (
                  <div>
                    <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider mb-1">Safety Cues</div>
                    <div className="space-y-0.5">
                      {technique.safetyCues.map((cue, i) => (
                        <div key={i} className="text-[9px] text-emerald-300/70 flex items-start gap-1">
                          <ShieldAlert className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                          <span>{cue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {technique.contraindications && technique.contraindications.toLowerCase() !== 'none' && (
                  <div>
                    <div className="text-[9px] font-medium text-red-400/80 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Contraindications
                    </div>
                    <div className="text-[10px] text-red-300/80">{technique.contraindications}</div>
                  </div>
                )}
                {technique.safetyCues.length === 0 && (!technique.contraindications || technique.contraindications.toLowerCase() === 'none') && (
                  <div className="text-[9px] text-gray-500">No specific safety concerns identified.</div>
                )}
              </div>
            )}

            {activeSection === 'progression' && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1.5">Progression Stages</div>
                <div className="space-y-1.5">
                  {[...technique.progressionStages].sort((a, b) => a.stage - b.stage).map((stage) => (
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

            {activeSection === 'selfTreatment' && technique.selfTreatmentAdaptation && (
              <div>
                <div className="text-[9px] font-medium text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Home className="h-2.5 w-2.5" />
                  Self-Treatment Adaptation
                </div>
                <div className="text-[10px] text-gray-300 leading-relaxed bg-gray-800/50 rounded p-2 border border-gray-700/30">{technique.selfTreatmentAdaptation}</div>
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

function TechniqueCard({ technique, index }: { technique: TechniqueItem; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-600/30 rounded bg-gray-800/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 p-2 text-left hover:bg-gray-700/20 transition-colors"
      >
        <span className="text-[10px] font-mono text-gray-500 mt-0.5 min-w-[16px]">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-gray-200">{technique.technique}</div>
          {technique.targetFinding && (
            <div className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-1">
              <Target className="h-2.5 w-2.5 text-rose-400 shrink-0" />
              <span className="truncate">{technique.targetFinding}</span>
            </div>
          )}
          <div className="flex gap-2 mt-1 text-[9px]">
            <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300">{technique.dosage || '?'}</span>
            {technique.patientPosition && (
              <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-400">Pos: {technique.patientPosition}</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0 mt-1" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-gray-700/30 pt-1.5">
          <div>
            <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Target Structure</div>
            <div className="text-[10px] text-gray-300">{technique.targetStructure}</div>
          </div>
          <div>
            <div className="text-[9px] font-medium text-rose-400/80 uppercase tracking-wider">Clinical Rationale</div>
            <div className="text-[10px] text-gray-300">{technique.rationale}</div>
          </div>
          <div>
            <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" />
              Expected Outcome
            </div>
            <div className="text-[10px] text-gray-300">{technique.expectedOutcome}</div>
          </div>
          <div>
            <div className="text-[9px] font-medium text-cyan-400/80 uppercase tracking-wider">Reassessment Criteria</div>
            <div className="text-[10px] text-gray-300">{technique.reassessmentCriteria}</div>
          </div>
          {technique.contraindications && technique.contraindications.toLowerCase() !== 'none' && (
            <div>
              <div className="text-[9px] font-medium text-red-400/80 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Contraindications
              </div>
              <div className="text-[10px] text-red-300/80">{technique.contraindications}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManualTherapyEngineTab({ mechanismAnalysis, slingAnalysis, painMarkers, scarMarkers, adhesionBands, musclePathologies, onHighlightMuscles, onSetMuscleHighlightColors, onSetManualTherapyAnnotations }: ManualTherapyEngineTabProps) {
  const [plan, setPlan] = useState<ManualTherapyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [customResult, setCustomResult] = useState<CustomManualTherapyResult | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [targetFocus, setTargetFocus] = useState('');
  const [showCustomDesigner, setShowCustomDesigner] = useState(false);
  const [showDesignRationale, setShowDesignRationale] = useState(false);
  const [selectedTechniqueIndex, setSelectedTechniqueIndex] = useState<number | null>(null);
  const customAbortRef = useRef<AbortController | null>(null);

  const [refinementInput, setRefinementInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementCount, setRefinementCount] = useState(0);
  const refineAbortRef = useRef<AbortController | null>(null);

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

    if (scarMarkers && scarMarkers.length > 0) {
      payload.scarMarkers = scarMarkers.map(s => ({
        anatomicalLabel: s.anatomicalLabel,
        type: s.type,
        severity: s.severity,
        age: s.age,
        mobility: s.mobility,
        affectedLayers: s.affectedLayers,
        painOnPalpation: s.painOnPalpation,
        nearestBone: s.nearestBone,
      }));
    }

    if (adhesionBands && adhesionBands.length > 0) {
      payload.adhesionBands = adhesionBands.map(b => ({
        startBone: b.startBone,
        endBone: b.endBone,
        tensionLevel: b.tensionLevel,
        depth: b.depth,
        restrictedMovements: b.restrictedMovements,
      }));
    }

    if (musclePathologies && musclePathologies.length > 0) {
      payload.musclePathologies = musclePathologies.map(m => ({
        muscleId: m.muscleId,
        label: m.label,
        pathology: m.pathology,
        severity: m.severity,
      }));
    }

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
  }, [mechanismAnalysis, slingAnalysis, painMarkers, scarMarkers, adhesionBands, musclePathologies]);

  const generatePlan = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const payload = buildPayload();
      const result = await apiRequest('/api/manual-therapy-engine/generate', 'POST', payload) as ManualTherapyPlan;
      if (controller.signal.aborted) return;
      const sorted = {
        ...result,
        techniqueGroups: [...(result.techniqueGroups || [])].sort((a, b) => a.priority - b.priority),
      };
      setPlan(sorted);
      const allIds = new Set(sorted.techniqueGroups.map(g => g.groupId));
      setExpandedGroups(allIds);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [buildPayload]);

  const designCustomTechniques = useCallback(async () => {
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
      const result = await apiRequest('/api/manual-therapy-engine/design-custom', 'POST', payload) as CustomManualTherapyResult;
      if (controller.signal.aborted) return;
      setCustomResult(result);
      setConversationHistory([]);
      setRefinementCount(0);
      setRefinementInput('');
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setCustomError(msg);
    } finally {
      if (!controller.signal.aborted) setCustomLoading(false);
    }
  }, [buildPayload, targetFocus]);

  const refineTechniques = useCallback(async (instruction: string) => {
    if (!customResult || !instruction.trim()) return;

    if (refineAbortRef.current) refineAbortRef.current.abort();
    const controller = new AbortController();
    refineAbortRef.current = controller;

    setIsRefining(true);
    setCustomError(null);

    try {
      const result = await apiRequest('/api/manual-therapy-engine/refine-custom', 'POST', {
        refinementInstruction: instruction.trim(),
        conversationHistory,
        currentTechniques: customResult,
      }) as CustomManualTherapyResult;

      if (controller.signal.aborted) return;

      setConversationHistory(prev => [
        ...prev,
        { role: 'user' as const, content: instruction.trim() },
        { role: 'assistant' as const, content: JSON.stringify(result) },
      ]);
      setRefinementCount(prev => prev + 1);
      setCustomResult(result);
      setRefinementInput('');
      setSelectedTechniqueIndex(null);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setCustomError(msg);
    } finally {
      if (!controller.signal.aborted) setIsRefining(false);
    }
  }, [customResult, conversationHistory]);

  const clearRefinementHistory = useCallback(() => {
    setConversationHistory([]);
    setRefinementCount(0);
    setRefinementInput('');
  }, []);

  const applyTissueHighlights = useCallback((techniques: CustomTechnique[]) => {
    if (!onHighlightMuscles || !onSetMuscleHighlightColors) return;
    const muscleGroupIds = new Set<string>();
    const colorMap: Record<string, string> = {};
    const allAnnotations: TissueTarget[] = [];

    for (const tech of techniques) {
      if (!tech.tissueTargets || tech.tissueTargets.length === 0) continue;
      for (const target of tech.tissueTargets) {
        allAnnotations.push(target);
        const groups = TISSUE_NAME_TO_MUSCLE_GROUP[target.tissueName.toLowerCase()];
        const color = GOAL_TYPE_COLORS[target.goalType] || '#06b6d4';
        if (groups) {
          for (const g of groups) {
            muscleGroupIds.add(g);
            if (!colorMap[g]) colorMap[g] = color;
          }
        } else {
          const lower = target.tissueName.toLowerCase().replace(/_/g, ' ');
          for (const [key, grps] of Object.entries(TISSUE_NAME_TO_MUSCLE_GROUP)) {
            const keyLower = key.replace(/_/g, ' ');
            if (keyLower.includes(lower) || lower.includes(keyLower)) {
              for (const g of grps) {
                muscleGroupIds.add(g);
                if (!colorMap[g]) colorMap[g] = color;
              }
              break;
            }
          }
        }
      }
    }

    onHighlightMuscles(Array.from(muscleGroupIds));
    onSetMuscleHighlightColors(colorMap);
    onSetManualTherapyAnnotations?.(allAnnotations.length > 0 ? allAnnotations : null);
  }, [onHighlightMuscles, onSetMuscleHighlightColors, onSetManualTherapyAnnotations]);

  const clearHighlights = useCallback(() => {
    onHighlightMuscles?.([]);
    onSetMuscleHighlightColors?.({});
    onSetManualTherapyAnnotations?.(null);
  }, [onHighlightMuscles, onSetMuscleHighlightColors, onSetManualTherapyAnnotations]);

  const handleTechniqueSelect = useCallback((index: number, expanded: boolean) => {
    if (expanded && customResult) {
      setSelectedTechniqueIndex(prev => prev === index ? null : index);
      const technique = customResult.customTechniques[index];
      if (technique) {
        applyTissueHighlights([technique]);
      }
    } else {
      setSelectedTechniqueIndex(null);
      if (customResult && showCustomDesigner) {
        applyTissueHighlights(customResult.customTechniques);
      } else {
        clearHighlights();
      }
    }
  }, [customResult, showCustomDesigner, applyTissueHighlights, clearHighlights]);

  useEffect(() => {
    if (customResult && showCustomDesigner) {
      setSelectedTechniqueIndex(null);
      applyTissueHighlights(customResult.customTechniques);
    } else {
      clearHighlights();
    }
  }, [customResult, showCustomDesigner]);

  useEffect(() => {
    return () => {
      clearHighlights();
    };
  }, []);

  const hasData = mechanismAnalysis !== null || (painMarkers && painMarkers.length > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <Hand className="h-8 w-8 text-gray-600 mb-2" />
        <div className="text-[11px] text-gray-400 mb-1">No clinical data available</div>
        <div className="text-[9px] text-gray-500">Place pain markers and run the mechanism analysis first to generate an AI manual therapy prescription.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-6 w-6 text-rose-400 animate-spin mb-3" />
        <div className="text-[11px] text-gray-300 mb-1">Generating manual therapy plan...</div>
        <div className="text-[9px] text-gray-500">AI is reasoning through tissue states, joint restrictions, and neural tension</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <AlertTriangle className="h-6 w-6 text-red-400 mb-2" />
        <div className="text-[11px] text-red-300 mb-2">Failed to generate manual therapy plan</div>
        <div className="text-[9px] text-gray-400 mb-3">{error}</div>
        <button onClick={generatePlan} className="px-3 py-1.5 text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded hover:bg-rose-500/30 transition-colors">
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
            <span className="text-[11px] font-semibold text-cyan-200">Manual Therapy Developer</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">AI Architect</span>
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">Design novel hands-on techniques from biomechanical first principles</div>
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
                placeholder="e.g., thoracolumbar fascia, posterior oblique sling, neural mobilization..."
                className="w-full px-2.5 py-1.5 text-[10px] bg-gray-800/70 border border-gray-600/40 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {MT_FOCUS_PRESETS.map(preset => (
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
            onClick={designCustomTechniques}
            disabled={customLoading}
            className="w-full px-4 py-2.5 text-[11px] font-medium bg-gradient-to-r from-cyan-600/20 to-cyan-500/10 text-cyan-300 border border-cyan-500/40 rounded-lg hover:from-cyan-600/30 hover:to-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {customLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Designing custom techniques...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Design Custom Techniques
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
                onClick={designCustomTechniques}
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
                    {customResult.customTechniques.length} Custom Techniques Designed
                  </span>
                </div>
                <button
                  onClick={designCustomTechniques}
                  disabled={customLoading}
                  className="px-2 py-1 text-[9px] bg-cyan-900/30 text-cyan-400 border border-cyan-700/30 rounded hover:bg-cyan-900/50 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  Redesign
                </button>
              </div>

              {customResult.customTechniques.map((tech, i) => (
                <CustomTechniqueCard key={i} technique={tech} index={i} isSelected={selectedTechniqueIndex === i} onSelect={handleTechniqueSelect} />
              ))}

              <div className="bg-gradient-to-r from-violet-950/30 to-gray-900/60 border border-violet-500/30 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-[10px] font-medium text-violet-300">Refine Techniques</span>
                    {refinementCount > 0 && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                        Refinement {refinementCount}
                      </span>
                    )}
                  </div>
                  {refinementCount > 0 && (
                    <button
                      onClick={clearRefinementHistory}
                      className="px-1.5 py-0.5 text-[8px] text-gray-400 hover:text-gray-200 border border-gray-600/30 rounded hover:bg-gray-700/40 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Clear history
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {REFINEMENT_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => setRefinementInput(preset.value)}
                      className={`px-2 py-0.5 text-[8px] rounded-full border transition-colors ${
                        refinementInput === preset.value
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                          : 'bg-gray-800/40 text-gray-400 border-gray-600/30 hover:text-gray-200 hover:border-gray-500/40'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && refinementInput.trim() && !isRefining) refineTechniques(refinementInput); }}
                    placeholder="e.g., make technique 2 gentler, avoid prone positioning..."
                    className="flex-1 px-2.5 py-1.5 text-[10px] bg-gray-800/70 border border-gray-600/40 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                    disabled={isRefining}
                  />
                  <button
                    onClick={() => refineTechniques(refinementInput)}
                    disabled={isRefining || !refinementInput.trim()}
                    className="px-3 py-1.5 text-[10px] font-medium bg-violet-600/20 text-violet-300 border border-violet-500/40 rounded hover:bg-violet-600/30 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRefining ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    {isRefining ? 'Refining...' : 'Refine'}
                  </button>
                </div>
              </div>

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
          <Hand className="h-8 w-8 text-rose-400/60 mb-3" />
          <div className="text-[11px] text-gray-300 mb-1">AI Manual Therapy Prescription</div>
          <div className="text-[9px] text-gray-500 mb-4 text-center max-w-[250px]">
            Generate a specific hands-on treatment plan based on mechanism analysis, sling deficits, and compensation patterns.
          </div>
          <button onClick={generatePlan} className="px-4 py-2 text-[11px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg hover:bg-rose-500/30 transition-colors flex items-center gap-2">
            <Hand className="h-3.5 w-3.5" />
            Generate Manual Therapy Plan
          </button>
        </div>
        {customDesignerSection}
      </div>
    );
  }

  const totalTechniques = plan.techniqueGroups.reduce((sum, g) => sum + g.techniques.length, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Hand className="h-3.5 w-3.5 text-rose-400" />
          <span className="text-[11px] font-medium text-gray-200">
            {totalTechniques} Techniques · {plan.techniqueGroups.length} Groups
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

      {plan.techniqueGroups.map(group => {
        const colors = GROUP_COLORS[group.goalTitle] ?? DEFAULT_COLORS;
        const Icon = GROUP_ICONS[group.goalTitle] ?? Hand;
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
                    P{group.priority} · {group.techniques.length} tech
                  </span>
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 truncate">{group.goalDescription}</div>
              </div>
              {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0" />}
            </button>
            {isExpanded && (
              <div className="p-2 space-y-1.5">
                {group.techniques.map((tech, i) => (
                  <TechniqueCard key={`${group.groupId}-${i}`} technique={tech} index={i} />
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
