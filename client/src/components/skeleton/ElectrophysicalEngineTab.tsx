import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Zap, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Target, TrendingUp, Shield, Loader2, Activity, Waves, ExternalLink, HelpCircle, BookOpen, Award, Stethoscope, Sparkles, Ban, Save, Trash2, Pencil, BookmarkPlus } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AddToPlanButton, makeCartId } from '@/lib/planCart';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { InjuryMechanismResult } from '@/lib/injuryMechanismEngine';
import type { SlingAnalysisResult } from '@/lib/slingEngine';

interface EvidenceArticle {
  title: string;
  authors: string;
  journal: string;
  year: number;
  pmid?: string;
  doi?: string;
  studyType: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D';
  pubmedUrl?: string;
  openAccessUrl?: string;
  sources?: string[];
  conclusion?: string;
  matchedOn?: { modality: string[]; region: string[]; condition: string[] };
}

interface EvidenceForModality {
  articles: EvidenceArticle[];
  overallGrade: 'A' | 'B' | 'C' | 'D';
  confidence?: string;
  source?: 'multi' | 'fallback' | string;
  fallbackReason?: string;
}

type EvidenceMap = Record<string, EvidenceForModality>;

const GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Strong' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Moderate' },
  C: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Limited' },
  D: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Insufficient' },
};

const STUDY_TYPE_BADGE: Record<string, string> = {
  'Meta-Analysis': 'bg-purple-500/20 text-purple-300',
  'Systematic Review': 'bg-purple-500/20 text-purple-300',
  'RCT': 'bg-emerald-500/20 text-emerald-300',
  'Clinical Guideline': 'bg-amber-500/20 text-amber-300',
  'Cohort': 'bg-sky-500/20 text-sky-300',
  'Case Study': 'bg-gray-600/30 text-gray-300',
};

function modalityKey(groupId: string, index: number): string {
  return `${groupId}::${index}`;
}

function ModalityEvidenceSection({ evidence, loading }: { evidence?: EvidenceForModality; loading: boolean }) {
  if (loading) {
    return (
      <div className="mt-1.5 border-t border-gray-700/40 pt-1.5">
        <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          Searching PubMed / PEDro / Europe PMC / OpenAlex…
        </div>
        <div className="mt-1 space-y-1">
          {[0, 1].map(i => (
            <div key={i} className="h-3 bg-gray-700/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!evidence || evidence.articles.length === 0) {
    return (
      <div className="mt-1.5 border-t border-gray-700/40 pt-1.5 text-[9px] text-gray-500 italic">
        {evidence?.fallbackReason || 'No supporting evidence found for this modality.'}
      </div>
    );
  }

  const grade = GRADE_STYLES[evidence.overallGrade] || GRADE_STYLES.D;
  return (
    <div className="mt-1.5 border-t border-gray-700/40 pt-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <BookOpen className="h-2.5 w-2.5 text-teal-400" />
        <span className="text-[9px] font-medium text-gray-300">Evidence ({evidence.articles.length})</span>
        <span className={`inline-flex items-center gap-0.5 text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${grade.bg} ${grade.text}`}>
          <Award className="h-2 w-2" />
          Grade {evidence.overallGrade} · {grade.label}
        </span>
        {evidence.source === 'fallback' && (
          <span className="text-[8px] text-amber-400/70 italic">curated fallback</span>
        )}
      </div>
      <div className="space-y-1">
        {evidence.articles.map((art, i) => {
          const aGrade = GRADE_STYLES[art.evidenceGrade] || GRADE_STYLES.D;
          const studyBadge = STUDY_TYPE_BADGE[art.studyType] || 'bg-gray-600/30 text-gray-300';
          const url = art.pubmedUrl || (art.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/` : (art.doi ? `https://doi.org/${art.doi}` : ''));
          const mo = art.matchedOn;
          const matchedParts: string[] = [];
          if (mo?.modality?.length) matchedParts.push(`modality: ${mo.modality.join(', ')}`);
          if (mo?.region?.length) matchedParts.push(`region: ${mo.region.join(', ')}`);
          if (mo?.condition?.length) matchedParts.push(`condition: ${mo.condition.join(', ')}`);
          return (
            <div key={i} className="bg-gray-900/50 border border-gray-700/40 rounded p-1.5">
              <div className="flex items-start gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-200 leading-tight font-medium">{art.title}</div>
                  <div className="text-[9px] text-gray-500 mt-0.5">
                    {art.authors.split(',').slice(0, 3).join(', ')}{art.authors.split(',').length > 3 ? ' et al.' : ''} · <span className="italic">{art.journal}</span> ({art.year})
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${aGrade.bg} ${aGrade.text}`}>{art.evidenceGrade}</span>
                  <span className={`text-[8px] px-1 py-0.5 rounded ${studyBadge}`}>{art.studyType}</span>
                </div>
              </div>
              {art.conclusion && (
                <div className="mt-1 text-[9px] text-gray-300 leading-snug border-l-2 border-teal-500/40 pl-1.5 italic">
                  “{art.conclusion}”
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[9px] text-teal-400 hover:text-teal-300"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    {art.pmid ? `PMID ${art.pmid}` : (art.doi ? `DOI` : 'Open')}
                  </a>
                )}
                {art.openAccessUrl && (
                  <a
                    href={art.openAccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 hover:text-emerald-300"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    Full text
                  </a>
                )}
              </div>
              {matchedParts.length > 0 && (
                <div className="mt-1 text-[8px] text-gray-500">
                  <span className="text-gray-400 font-medium">matched on </span>
                  {matchedParts.map((part, k) => {
                    const [label, val] = part.split(': ');
                    return (
                      <span key={k}>
                        {k > 0 && <span className="text-gray-600"> · </span>}
                        <span className="text-gray-400">{label}:</span>{' '}
                        <span className="text-teal-300/80">{val}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ResourceLink {
  title: string;
  url: string;
}

interface Citation {
  title: string;
  source?: string;
  year?: number | string;
  url?: string;
}

type EpaMechanism = 'electrical' | 'acoustic' | 'thermal' | 'photonic' | 'electromagnetic' | 'radiofrequency';
type EpaTargetTissue = 'muscle' | 'tendon' | 'nerve' | 'bone' | 'joint' | 'skin_fascia';
type EpaDesiredEffect = 'pain_reduction' | 'healing_stimulation' | 'muscle_activation' | 'swelling_reduction' | 'tissue_extensibility' | 'bone_healing';
type EpaEvidenceStrength = 'strong' | 'moderate' | 'weak';

interface EpaDosing {
  intensity?: string;
  frequency_hz?: number;
  pulse_width_us?: number;
  duration_min?: number;
  sessions_per_week?: number;
  total_sessions?: number;
  placement?: string;
}

interface ModalityItem {
  modality: string;
  targetStructure: string;
  targetFinding: string;
  parameters: string;
  patientPosition: string;
  rationale: string;
  contraindications: string;
  expectedPhysiologicalEffect: string;
  reassessmentCriteria: string;
  modalityDescription?: string;
  resourceLinks?: ResourceLink[];
  evidenceGrade?: 'A' | 'B' | 'C';
  evidenceJustification?: string;
  stageAppropriateness?: string;
  citations?: Citation[];
  notAdvisedReason?: string;
  // EPA 4-dimension reasoning + structured dosing (Task #223)
  mechanism?: EpaMechanism;
  targetTissue?: EpaTargetTissue;
  desiredEffect?: EpaDesiredEffect;
  evidenceStrength?: EpaEvidenceStrength;
  dosing?: EpaDosing;
}

const MECHANISM_STYLES: Record<EpaMechanism, { label: string; bg: string; text: string }> = {
  electrical:      { label: 'Electrical',      bg: 'bg-yellow-500/15',  text: 'text-yellow-300' },
  acoustic:        { label: 'Acoustic',        bg: 'bg-cyan-500/15',    text: 'text-cyan-300' },
  thermal:         { label: 'Thermal',         bg: 'bg-orange-500/15',  text: 'text-orange-300' },
  photonic:        { label: 'Photonic',        bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-300' },
  electromagnetic: { label: 'Electromagnetic', bg: 'bg-violet-500/15',  text: 'text-violet-300' },
  radiofrequency:  { label: 'Radiofrequency',  bg: 'bg-pink-500/15',    text: 'text-pink-300' },
};

const TISSUE_LABELS: Record<EpaTargetTissue, string> = {
  muscle: 'Muscle', tendon: 'Tendon', nerve: 'Nerve', bone: 'Bone', joint: 'Joint', skin_fascia: 'Skin / Fascia',
};

const EFFECT_LABELS: Record<EpaDesiredEffect, string> = {
  pain_reduction: 'Pain ↓',
  healing_stimulation: 'Healing ↑',
  muscle_activation: 'Activation ↑',
  swelling_reduction: 'Swelling ↓',
  tissue_extensibility: 'Extensibility ↑',
  bone_healing: 'Bone healing ↑',
};

const EVIDENCE_STRENGTH_STYLES: Record<EpaEvidenceStrength, { label: string; bg: string; text: string }> = {
  strong:   { label: 'Strong',   bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  moderate: { label: 'Moderate', bg: 'bg-sky-500/20',     text: 'text-sky-300' },
  weak:     { label: 'Weak',     bg: 'bg-amber-500/20',   text: 'text-amber-300' },
};

/**
 * Deterministic fallbacks so legacy / partial responses still render the
 * full 4-dimension reasoning chips required by Task #223.
 */
function inferMechanism(modalityName: string, groupHint?: string): EpaMechanism {
  const s = `${modalityName} ${groupHint ?? ''}`.toLowerCase();
  if (/(shockwave|ultrasound|acoustic|eswt|vibration)/.test(s)) return 'acoustic';
  if (/(laser|lllt|hilt|light|infrared|photon|led|photo)/.test(s)) return 'photonic';
  if (/(diatherm|pemf|magnetic|electromagnet|microwave|shortwave)/.test(s)) return 'electromagnetic';
  if (/(radiofreq|tecar|inductotherm|capacitive|rf\b)/.test(s)) return 'radiofrequency';
  if (/(hot\s*pack|cold|ice|cryo|contrast|paraffin|fluidotherapy|moist\s*heat|thermal)/.test(s)) return 'thermal';
  return 'electrical';
}
function inferTargetTissue(modality: ModalityItem): EpaTargetTissue {
  const s = `${modality.modality} ${modality.targetStructure ?? ''} ${modality.targetFinding ?? ''}`.toLowerCase();
  if (/(tendon|tendinop|achilles|patellar\s+tend|rotator\s+cuff)/.test(s)) return 'tendon';
  if (/(nerve|radicul|neuropath|neuralgia|sciatic)/.test(s)) return 'nerve';
  if (/(bone|fracture|stress\s+fx|osteo(?!arthr))/.test(s)) return 'bone';
  if (/(joint|capsul|arthr|synovi)/.test(s)) return 'joint';
  if (/(skin|fascia|scar|adhesion|wound)/.test(s)) return 'skin_fascia';
  return 'muscle';
}
function inferDesiredEffect(modality: ModalityItem, groupHint?: string): EpaDesiredEffect {
  const s = `${modality.modality} ${modality.expectedPhysiologicalEffect ?? ''} ${groupHint ?? ''}`.toLowerCase();
  if (/(pain|analges|antinocicep|gate)/.test(s)) return 'pain_reduction';
  if (/(swelling|edema|inflamm|effusion)/.test(s)) return 'swelling_reduction';
  if (/(activation|recruit|motor|nmes|russian|strength)/.test(s)) return 'muscle_activation';
  if (/(extensibility|stretch|mobility|flexibility|range|rom)/.test(s)) return 'tissue_extensibility';
  if (/(bone\s+healing|osteogen|fracture\s+heal)/.test(s)) return 'bone_healing';
  return 'healing_stimulation';
}
function inferEvidenceStrength(modality: ModalityItem): EpaEvidenceStrength {
  if (modality.evidenceGrade === 'A') return 'strong';
  if (modality.evidenceGrade === 'B') return 'moderate';
  if (modality.evidenceGrade === 'C') return 'weak';
  return 'moderate';
}

function formatDosing(d?: EpaDosing): Array<{ label: string; value: string }> {
  if (!d) return [];
  const out: Array<{ label: string; value: string }> = [];
  if (d.intensity) out.push({ label: 'Intensity', value: d.intensity });
  if (d.frequency_hz != null) out.push({ label: 'Freq', value: `${d.frequency_hz} Hz` });
  if (d.pulse_width_us != null) out.push({ label: 'PW', value: `${d.pulse_width_us} µs` });
  if (d.duration_min != null) out.push({ label: 'Time', value: `${d.duration_min} min` });
  if (d.sessions_per_week != null) out.push({ label: '/ wk', value: `${d.sessions_per_week}` });
  if (d.total_sessions != null) out.push({ label: 'Total', value: `${d.total_sessions}` });
  if (d.placement) out.push({ label: 'Placement', value: d.placement });
  return out;
}

interface ModalityGroup {
  groupId: string;
  goalTitle: string;
  goalDescription: string;
  priority: number;
  modalities: ModalityItem[];
}

interface TopPick {
  modality: string;
  why: string;
  evidenceGrade?: 'A' | 'B' | 'C';
}

interface ElectrophysicalPlan {
  modalityGroups: ModalityGroup[];
  clinicalNotes: string;
  irritabilityConsiderations: string;
  topPicks?: TopPick[];
  conditionEcho?: string;
}

type Stage = '' | 'acute' | 'subacute' | 'chronic';
type Irritability = '' | 'low' | 'moderate' | 'high';
type PrimaryGoal = '' | 'pain' | 'healing' | 'loading' | 'mobility' | 'activation';
type ContraindicationFlag =
  | 'pregnancy' | 'pacemaker' | 'metal_implant' | 'malignancy' | 'open_wound'
  | 'active_infection' | 'dvt' | 'hemorrhage' | 'sensory_deficit' | 'epilepsy' | 'skin_breakdown';

const CONTRAINDICATION_OPTIONS: { value: ContraindicationFlag; label: string }[] = [
  { value: 'pregnancy', label: 'Pregnancy' },
  { value: 'pacemaker', label: 'Pacemaker / IED' },
  { value: 'metal_implant', label: 'Metal implant' },
  { value: 'malignancy', label: 'Malignancy' },
  { value: 'open_wound', label: 'Open wound' },
  { value: 'active_infection', label: 'Active infection' },
  { value: 'dvt', label: 'DVT risk' },
  { value: 'hemorrhage', label: 'Bleeding / hemorrhage' },
  { value: 'sensory_deficit', label: 'Sensory deficit' },
  { value: 'epilepsy', label: 'Epilepsy' },
  { value: 'skin_breakdown', label: 'Skin breakdown' },
];

const CONDITION_GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Strong' },
  B: { bg: 'bg-sky-500/20', text: 'text-sky-300', label: 'Moderate' },
  C: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Limited' },
};

interface PainMarkerInput {
  label: string;
  severity?: number;
  type?: string;
}

interface ElectrophysicalEngineTabProps {
  mechanismAnalysis: InjuryMechanismResult | null;
  slingAnalysis: SlingAnalysisResult | null;
  painMarkers: PainMarkerInput[];
  /** Notifies parent whenever the local plan changes so other surfaces
   *  (e.g. Recovery Simulator phase cards) can read the latest
   *  electrophysical recommendations without re-fetching. */
  onPlanChange?: (plan: ElectrophysicalPlan | null) => void;
  /** Pre-fill condition / stage when the tab is opened from another
   *  surface (e.g. a phase card's "Generate electrophysical plan" CTA). */
  initialCondition?: string;
  initialStage?: Stage;
  /** Monotonic counter; each new value re-syncs initialCondition/initialStage
   *  into local state and (with autoGenerate) re-fires generation. */
  autoGenerateNonce?: number;
  /** When true, automatically run generatePlan() once after mount with
   *  the supplied initialCondition / initialStage. Resets after firing. */
  autoGenerate?: boolean;
  onAutoGenerateConsumed?: () => void;
  /** Optional patient/conversation id used to scope saved Condition presets.
   *  When null/undefined, presets are user-global ("any patient"). */
  patientId?: number | null;
}

interface ElectroConditionPreset {
  id: number;
  userId: number;
  patientId: number | null;
  name: string;
  condition: string;
  stage: string;
  irritability: string;
  tissueType: string;
  primaryGoal: string;
  contraindicationFlags: string[];
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type { ElectrophysicalPlan, ModalityItem, ModalityGroup };

const GROUP_ICONS: Record<string, typeof Zap> = {
  'Pain Modulation': Waves,
  'Tissue Healing & Repair': Activity,
  'Muscle Activation & Facilitation': Zap,
  'Joint Mobility & Traction': TrendingUp,
  'Myofascial Release & Trigger Points': Target,
};

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  'Pain Modulation': { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-300', badge: 'bg-teal-500/20 text-teal-300' },
  'Tissue Healing & Repair': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', badge: 'bg-cyan-500/20 text-cyan-300' },
  'Muscle Activation & Facilitation': { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-300', badge: 'bg-sky-500/20 text-sky-300' },
  'Joint Mobility & Traction': { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300', badge: 'bg-indigo-500/20 text-indigo-300' },
  'Myofascial Release & Trigger Points': { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-300', badge: 'bg-violet-500/20 text-violet-300' },
};

const DEFAULT_COLORS = { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-300', badge: 'bg-teal-500/20 text-teal-300' };

function ModalityCard({ modality, index, evidence, evidenceLoading, groupHint }: { modality: ModalityItem; index: number; evidence?: EvidenceForModality; evidenceLoading: boolean; groupHint?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isNotAdvised = !!modality.notAdvisedReason;
  const conditionGrade = modality.evidenceGrade ? CONDITION_GRADE_STYLES[modality.evidenceGrade] : null;
  const cartItem = {
    id: makeCartId('electrophysical', modality.modality),
    modality: 'electrophysical' as const,
    name: modality.modality,
    targetStructure: modality.targetStructure,
    targetFinding: modality.targetFinding,
    parameters: modality.parameters,
    dosage: modality.parameters,
    rationale: modality.rationale,
    contraindications: modality.contraindications,
    evidenceGrade: modality.evidenceGrade,
    patientPosition: modality.patientPosition,
    mechanism: modality.mechanism,
    targetTissue: modality.targetTissue,
    desiredEffect: modality.desiredEffect,
    evidenceStrength: modality.evidenceStrength,
    dosing: modality.dosing,
  };
  // Always render the 4 dimension chips. When the AI response (or a legacy
  // cached card) is missing a dimension, derive it deterministically from
  // modality name / target structure / group context so clinicians never
  // see a half-populated reasoning row (Task #223).
  const mechanism = modality.mechanism ?? inferMechanism(modality.modality, groupHint);
  const targetTissue = modality.targetTissue ?? inferTargetTissue(modality);
  const desiredEffect = modality.desiredEffect ?? inferDesiredEffect(modality, groupHint);
  const evidenceStrength = modality.evidenceStrength ?? inferEvidenceStrength(modality);
  const mechStyle = MECHANISM_STYLES[mechanism];
  const tissueLabel = TISSUE_LABELS[targetTissue];
  const effectLabel = EFFECT_LABELS[desiredEffect];
  const strengthStyle = EVIDENCE_STRENGTH_STYLES[evidenceStrength];
  const dosingFields = formatDosing(modality.dosing);

  return (
    <div className={`border rounded ${isNotAdvised ? 'border-red-500/40 bg-red-500/5' : 'border-gray-600/30 bg-gray-800/40'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 p-2 text-left hover:bg-gray-700/20 transition-colors"
      >
        <span className="text-[10px] font-mono text-gray-500 mt-0.5 min-w-[16px]">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="text-[11px] font-medium text-gray-200">{modality.modality}</div>
            {isNotAdvised && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-200 border border-red-500/50">
                <Ban className="h-2 w-2" />
                Not advised
              </span>
            )}
            {conditionGrade && (
              <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${conditionGrade.bg} ${conditionGrade.text}`} title={modality.evidenceJustification || `Evidence grade ${modality.evidenceGrade}`}>
                <Award className="h-2 w-2" />
                {modality.evidenceGrade} · {conditionGrade.label}
              </span>
            )}
            {modality.stageAppropriateness && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 truncate max-w-[180px]" title={modality.stageAppropriateness}>
                {modality.stageAppropriateness}
              </span>
            )}
            {evidence ? (
              <span
                className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${(GRADE_STYLES[evidence.overallGrade] || GRADE_STYLES.D).bg} ${(GRADE_STYLES[evidence.overallGrade] || GRADE_STYLES.D).text} inline-flex items-center gap-0.5`}
                title={`Overall evidence grade · ${evidence.articles.length} supporting article${evidence.articles.length === 1 ? '' : 's'}`}
              >
                <Award className="h-2 w-2" />
                {evidence.overallGrade}
              </span>
            ) : evidenceLoading ? (
              <span className="text-[8px] text-gray-500 inline-flex items-center gap-0.5">
                <Loader2 className="h-2 w-2 animate-spin" />
                evidence
              </span>
            ) : null}
          </div>
          {modality.targetFinding && (
            <div className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-1">
              <Target className="h-2.5 w-2.5 text-teal-400 shrink-0" />
              <span className="truncate">{modality.targetFinding}</span>
            </div>
          )}
          {(
            <div className="flex gap-1 mt-1 flex-wrap" data-testid={`epa-dimension-chips-${index}`}>
              {(
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${mechStyle.bg} ${mechStyle.text} border border-current/20`} title={modality.mechanism ? 'Mechanism' : 'Mechanism (inferred)'}>
                  ⚙ {mechStyle.label}{!modality.mechanism && '*'}
                </span>
              )}
              {(
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30" title={modality.targetTissue ? 'Target tissue' : 'Target tissue (inferred)'}>
                  🎯 {tissueLabel}{!modality.targetTissue && '*'}
                </span>
              )}
              {(
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30" title={modality.desiredEffect ? 'Desired effect' : 'Desired effect (inferred)'}>
                  ✦ {effectLabel}{!modality.desiredEffect && '*'}
                </span>
              )}
              {(
                <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${strengthStyle.bg} ${strengthStyle.text} border border-current/20`} title={modality.evidenceStrength ? 'Evidence strength' : 'Evidence strength (inferred)'}>
                  📊 {strengthStyle.label}{!modality.evidenceStrength && '*'}
                </span>
              )}
            </div>
          )}
          {!isNotAdvised && (
            <div className="flex gap-2 mt-1 text-[9px] flex-wrap items-center">
              <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300 truncate max-w-[180px]">{modality.parameters || '?'}</span>
              {modality.patientPosition && (
                <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-400">Pos: {modality.patientPosition}</span>
              )}
              <AddToPlanButton size="xs" item={cartItem} />
            </div>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0 mt-1" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-gray-700/30 pt-1.5">
          <div>
            <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Target Structure</div>
            <div className="text-[10px] text-gray-300">{modality.targetStructure}</div>
          </div>
          {!isNotAdvised && dosingFields.length > 0 && (
            <div className="border border-teal-500/30 rounded bg-teal-500/5 p-1.5">
              <div className="text-[9px] font-medium text-teal-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" />
                Dosing
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {dosingFields.map((f, fi) => (
                  <div key={fi} className="flex items-baseline gap-1 text-[10px]">
                    <span className="text-gray-500 uppercase tracking-wider text-[8px] shrink-0">{f.label}</span>
                    <span className="text-gray-200 font-mono truncate">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!isNotAdvised && (
            <div>
              <div className="text-[9px] font-medium text-teal-400/80 uppercase tracking-wider">Parameters (notes)</div>
              <div className="text-[10px] text-gray-300">{modality.parameters}</div>
            </div>
          )}
          <div>
            <div className="text-[9px] font-medium text-cyan-400/80 uppercase tracking-wider">Clinical Rationale</div>
            <div className="text-[10px] text-gray-300">{modality.rationale}</div>
          </div>
          <div>
            <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" />
              Expected Physiological Effect
            </div>
            <div className="text-[10px] text-gray-300">{modality.expectedPhysiologicalEffect}</div>
          </div>
          <div>
            <div className="text-[9px] font-medium text-sky-400/80 uppercase tracking-wider">Reassessment Criteria</div>
            <div className="text-[10px] text-gray-300">{modality.reassessmentCriteria}</div>
          </div>
          {modality.contraindications && modality.contraindications.toLowerCase() !== 'none' && (
            <div>
              <div className="text-[9px] font-medium text-red-400/80 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Contraindications
              </div>
              <div className="text-[10px] text-red-300/80">{modality.contraindications}</div>
            </div>
          )}
          {modality.modalityDescription && (
            <div className="border border-teal-500/20 rounded bg-teal-500/5 p-1.5">
              <div className="text-[9px] font-medium text-teal-400/80 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                <HelpCircle className="h-2.5 w-2.5" />
                What is this modality?
              </div>
              <div className="text-[10px] text-gray-300 leading-relaxed">{modality.modalityDescription}</div>
            </div>
          )}
          {modality.resourceLinks && modality.resourceLinks.length > 0 && (
            <div>
              <div className="text-[9px] font-medium text-blue-400/80 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                <ExternalLink className="h-2.5 w-2.5" />
                Learn More
              </div>
              <div className="flex flex-col gap-0.5">
                {modality.resourceLinks.map((link, li) => (
                  <a
                    key={li}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="h-2 w-2 shrink-0" />
                    <span className="truncate">{link.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {modality.notAdvisedReason && (
            <div className="border border-red-500/40 rounded bg-red-500/10 p-1.5">
              <div className="text-[9px] font-medium text-red-300 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                <Ban className="h-2.5 w-2.5" />
                Not advised — reason
              </div>
              <div className="text-[10px] text-red-200 leading-relaxed">{modality.notAdvisedReason}</div>
            </div>
          )}
          {modality.evidenceJustification && (
            <div>
              <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                <Award className="h-2.5 w-2.5" />
                Evidence rationale
              </div>
              <div className="text-[10px] text-gray-300 leading-snug">{modality.evidenceJustification}</div>
            </div>
          )}
          {modality.citations && modality.citations.length > 0 && (
            <div>
              <div className="text-[9px] font-medium text-purple-400/80 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                <BookOpen className="h-2.5 w-2.5" />
                Citations
              </div>
              <div className="space-y-0.5">
                {modality.citations.map((c, ci) => {
                  const inner = (
                    <>
                      <span className="text-[10px] text-gray-200">{c.title}</span>
                      {(c.source || c.year) && (
                        <span className="text-[9px] text-gray-500 ml-1">
                          {c.source}{c.source && c.year ? ', ' : ''}{c.year}
                        </span>
                      )}
                    </>
                  );
                  return c.url ? (
                    <a
                      key={ci}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[10px] hover:text-purple-300 hover:underline transition-colors"
                    >
                      <ExternalLink className="inline h-2 w-2 mr-1 text-purple-400" />
                      {inner}
                    </a>
                  ) : (
                    <div key={ci} className="text-[10px]">{inner}</div>
                  );
                })}
              </div>
            </div>
          )}
          <ModalityEvidenceSection evidence={evidence} loading={evidenceLoading && !evidence} />
        </div>
      )}
      {!expanded && (evidence || evidenceLoading) && (
        <div className="px-2 pb-1.5 -mt-0.5">
          {evidenceLoading && !evidence ? (
            <div className="flex items-center gap-1 text-[8px] text-gray-500">
              <Loader2 className="h-2 w-2 animate-spin" />
              fetching evidence…
            </div>
          ) : evidence ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${(GRADE_STYLES[evidence.overallGrade] || GRADE_STYLES.D).bg} ${(GRADE_STYLES[evidence.overallGrade] || GRADE_STYLES.D).text}`}>
                Grade {evidence.overallGrade}
              </span>
              <span className="text-[8px] text-gray-500">
                {evidence.articles.length} article{evidence.articles.length === 1 ? '' : 's'}
              </span>
              {evidence.source === 'fallback' && (
                <span className="text-[8px] text-amber-400/70 italic">curated</span>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function ElectrophysicalEngineTab({ mechanismAnalysis, slingAnalysis, painMarkers, onPlanChange, initialCondition, initialStage, autoGenerateNonce, autoGenerate, onAutoGenerateConsumed, patientId = null }: ElectrophysicalEngineTabProps) {
  const [plan, setPlan] = useState<ElectrophysicalPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(false);
  const [evidenceMap, setEvidenceMap] = useState<EvidenceMap>({});
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Condition & context inputs
  const [condition, setCondition] = useState(initialCondition ?? '');
  const [stage, setStage] = useState<Stage>(initialStage ?? '');
  const [irritability, setIrritability] = useState<Irritability>('');
  const [tissueType, setTissueType] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>('');
  const [contraindicationFlags, setContraindicationFlags] = useState<ContraindicationFlag[]>([]);
  const [showContextEditor, setShowContextEditor] = useState(true);

  // ----- Saved Condition presets (per-clinician, optionally per-patient) -----
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [savePromptName, setSavePromptName] = useState('');
  const [renamingPresetId, setRenamingPresetId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const autoLoadedRef = useRef(false);

  const presetsKey = useMemo(
    () => ['/api/electrophysical-engine/presets', patientId ?? null] as const,
    [patientId],
  );
  const presetsQuery = useQuery<ElectroConditionPreset[]>({
    queryKey: presetsKey,
    queryFn: async () => {
      const url = patientId != null
        ? `/api/electrophysical-engine/presets?patientId=${patientId}`
        : `/api/electrophysical-engine/presets`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load presets (${res.status})`);
      return res.json();
    },
  });

  const applyPreset = useCallback((p: ElectroConditionPreset) => {
    setCondition(p.condition ?? '');
    setStage((p.stage as Stage) ?? '');
    setIrritability((p.irritability as Irritability) ?? '');
    setTissueType(p.tissueType ?? '');
    setPrimaryGoal((p.primaryGoal as PrimaryGoal) ?? '');
    setContraindicationFlags(((p.contraindicationFlags ?? []) as ContraindicationFlag[]).filter(Boolean));
    setActivePresetId(p.id);
  }, []);

  // Reset the auto-load latch whenever the active patient changes so the
  // most-recently-used preset for the *new* patient is picked up the next
  // time the presets query resolves. Also clears the active selection so we
  // don't carry the prior patient's preset id over.
  useEffect(() => {
    autoLoadedRef.current = false;
    setActivePresetId(null);
  }, [patientId]);

  // Auto-load most-recently-used preset on first mount once the list arrives.
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (!presetsQuery.data || presetsQuery.data.length === 0) return;
    // Don't clobber a condition the parent pre-filled via initialCondition.
    if ((initialCondition ?? '').trim().length > 0) {
      autoLoadedRef.current = true;
      return;
    }
    autoLoadedRef.current = true;
    applyPreset(presetsQuery.data[0]);
  }, [presetsQuery.data, initialCondition, applyPreset]);

  const savePresetMutation = useMutation({
    mutationFn: async (name: string) => {
      const saved = await apiRequest('/api/electrophysical-engine/presets', 'POST', {
        patientId: patientId ?? null,
        name,
        condition,
        stage,
        irritability,
        tissueType,
        primaryGoal,
        contraindicationFlags,
      });
      return saved as ElectroConditionPreset;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: presetsKey });
      setActivePresetId(saved.id);
      setSavePromptOpen(false);
      setSavePromptName('');
    },
  });

  const renamePresetMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const updated = await apiRequest(`/api/electrophysical-engine/presets/${id}`, 'PATCH', { name });
      return updated as ElectroConditionPreset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presetsKey });
      setRenamingPresetId(null);
      setRenameValue('');
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/electrophysical-engine/presets/${id}`, 'DELETE');
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: presetsKey });
      if (activePresetId === id) setActivePresetId(null);
    },
  });

  const touchPreset = useCallback((id: number) => {
    void apiRequest(`/api/electrophysical-engine/presets/${id}`, 'PATCH', { touch: true })
      .then(() => queryClient.invalidateQueries({ queryKey: presetsKey }))
      .catch(() => { /* non-fatal */ });
  }, [presetsKey]);

  const abortRef = useRef<AbortController | null>(null);
  const evidenceAbortRef = useRef<AbortController | null>(null);
  const planChangeRef = useRef(onPlanChange);
  planChangeRef.current = onPlanChange;
  // Notify parent on plan changes so other surfaces (Recovery Simulator
  // phase cards, etc.) can read the latest electrophysical plan. Skip the
  // initial mount-time `null` so we don't wipe a plan the parent is already
  // holding (e.g. when this tab is unmounted/remounted by tab switching).
  const skipInitialPlanEmitRef = useRef(true);
  useEffect(() => {
    if (skipInitialPlanEmitRef.current) {
      skipInitialPlanEmitRef.current = false;
      if (plan === null) return;
    }
    planChangeRef.current?.(plan);
  }, [plan]);

  const toggleContraindication = useCallback((flag: ContraindicationFlag) => {
    setContraindicationFlags(prev => prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]);
  }, []);

  const fetchEvidence = useCallback(async (currentPlan: ElectrophysicalPlan) => {
    if (evidenceAbortRef.current) evidenceAbortRef.current.abort();
    const controller = new AbortController();
    evidenceAbortRef.current = controller;

    const modalitiesPayload: Array<{ key: string; modality: string; targetStructure: string; targetFinding: string; goalTitle: string }> = [];
    currentPlan.modalityGroups.forEach(group => {
      group.modalities.forEach((mod, idx) => {
        modalitiesPayload.push({
          key: modalityKey(group.groupId, idx),
          modality: mod.modality,
          targetStructure: mod.targetStructure || '',
          targetFinding: mod.targetFinding || '',
          goalTitle: group.goalTitle || '',
        });
      });
    });

    if (modalitiesPayload.length === 0) return;

    const region = (mechanismAnalysis?.topContributors?.[0] as { region?: string } | undefined)?.region
      || painMarkers[0]?.label
      || '';
    const evidenceCondition = condition.trim()
      || mechanismAnalysis?.overallMechanismSummary?.split(/[.,;]/)[0]?.trim().slice(0, 80)
      || '';

    setEvidenceLoading(true);
    setEvidenceError(null);
    setEvidenceMap({});

    try {
      const result = await apiRequest('/api/electrophysical-engine/evidence', 'POST', {
        modalities: modalitiesPayload,
        region,
        condition: evidenceCondition,
      }) as { evidenceByModality: EvidenceMap };
      if (controller.signal.aborted) return;
      setEvidenceMap(result.evidenceByModality || {});
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setEvidenceError(msg);
    } finally {
      if (!controller.signal.aborted) setEvidenceLoading(false);
    }
  }, [mechanismAnalysis, painMarkers, condition]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const generatePlan = useCallback(async (overrides?: { condition?: string; stage?: Stage }) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    // Allow callers (e.g. the auto-generate effect fired by a phase-card CTA)
    // to pass explicit condition/stage so we never depend on the React state
    // having committed before this async call runs.
    const effectiveCondition = (overrides?.condition ?? condition).trim();
    const effectiveStage: Stage = overrides?.stage ?? stage;

    try {
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
        condition: effectiveCondition,
        stage: effectiveStage,
        irritability,
        tissueType: tissueType.trim(),
        primaryGoal,
        contraindicationFlags,
        ...(activePresetId != null ? { presetId: activePresetId } : {}),
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
            treatmentTargets: s.treatmentTargets.map(t => ({
              muscle: t.muscle,
              intervention: t.intervention,
              rationale: t.rationale,
            })),
            narrative: s.narrative,
          })),
        };
      }

      const result = await apiRequest('/api/electrophysical-engine/generate', 'POST', payload) as ElectrophysicalPlan;
      if (controller.signal.aborted) return;
      const sorted = {
        ...result,
        modalityGroups: [...(result.modalityGroups || [])].sort((a, b) => a.priority - b.priority),
      };
      setPlan(sorted);
      const allIds = new Set(sorted.modalityGroups.map(g => g.groupId));
      setExpandedGroups(allIds);
      void fetchEvidence(sorted);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [mechanismAnalysis, slingAnalysis, painMarkers, condition, stage, irritability, tissueType, primaryGoal, contraindicationFlags, activePresetId, fetchEvidence]);

  // Each new `autoGenerateNonce` from the parent represents a fresh phase-card
  // CTA: re-sync condition/stage from the latest `initialCondition`/`initialStage`
  // props into local state and (if `autoGenerate` is on) fire generatePlan with
  // those values passed *explicitly* — never relying on the React state having
  // committed before the async call runs.
  const lastNonceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoGenerateNonce === undefined || autoGenerateNonce === lastNonceRef.current) return;
    lastNonceRef.current = autoGenerateNonce;
    const nextCondition = initialCondition ?? '';
    const nextStage: Stage = initialStage ?? '';
    setCondition(nextCondition);
    setStage(nextStage);
    if (autoGenerate) {
      void generatePlan({ condition: nextCondition, stage: nextStage });
    }
    onAutoGenerateConsumed?.();
  }, [autoGenerateNonce, autoGenerate, initialCondition, initialStage, generatePlan, onAutoGenerateConsumed]);

  const hasData = mechanismAnalysis !== null || (painMarkers && painMarkers.length > 0) || condition.trim().length > 0;

  const presets = presetsQuery.data ?? [];
  const presetsBar = (
    <div className="border border-teal-500/30 rounded-lg bg-teal-500/5 px-2 py-1.5 flex items-center gap-1.5 flex-wrap">
      <BookmarkPlus className="h-3 w-3 text-teal-300 shrink-0" />
      <span className="text-[10px] text-teal-200 font-medium">Saved condition presets{patientId == null ? '' : ' (this patient)'}:</span>
      <select
        value={activePresetId ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) { setActivePresetId(null); return; }
          const id = Number(v);
          const p = presets.find(x => x.id === id);
          if (p) {
            applyPreset(p);
            touchPreset(p.id);
          }
        }}
        className="bg-gray-900/60 border border-gray-700/60 rounded px-1.5 py-0.5 text-[10px] text-gray-100 focus:outline-none focus:border-teal-500/60 min-w-[140px]"
        data-testid="select-electro-preset"
      >
        <option value="">{presets.length === 0 ? '— no presets saved —' : '— select a preset —'}</option>
        {presets.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          const trimmed = condition.trim();
          setSavePromptName(trimmed.slice(0, 60) || 'Untitled preset');
          setSavePromptOpen(true);
        }}
        disabled={savePresetMutation.isPending}
        className="text-[10px] px-1.5 py-0.5 rounded border border-teal-500/40 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
        data-testid="button-save-electro-preset"
        title="Save current condition + context as a preset"
      >
        <Save className="h-2.5 w-2.5" /> Save
      </button>
      {activePresetId != null && (() => {
        const active = presets.find(p => p.id === activePresetId);
        if (!active) return null;
        return (
          <>
            <button
              type="button"
              onClick={() => { setRenamingPresetId(active.id); setRenameValue(active.name); }}
              className="text-[10px] px-1.5 py-0.5 rounded border border-gray-600/40 bg-gray-800/40 text-gray-300 hover:bg-gray-800/70 transition-colors flex items-center gap-1"
              data-testid="button-rename-electro-preset"
              title="Rename preset"
            >
              <Pencil className="h-2.5 w-2.5" /> Rename
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete preset "${active.name}"?`)) {
                  deletePresetMutation.mutate(active.id);
                }
              }}
              disabled={deletePresetMutation.isPending}
              className="text-[10px] px-1.5 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
              data-testid="button-delete-electro-preset"
              title="Delete preset"
            >
              <Trash2 className="h-2.5 w-2.5" /> Delete
            </button>
          </>
        );
      })()}
      {savePromptOpen && (
        <div className="basis-full flex items-center gap-1.5 mt-1">
          <input
            type="text"
            value={savePromptName}
            onChange={(e) => setSavePromptName(e.target.value.slice(0, 80))}
            placeholder="Preset name (e.g. Achilles tendinopathy — chronic)"
            className="flex-1 bg-gray-900/60 border border-gray-700/60 rounded px-2 py-1 text-[10px] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-teal-500/60"
            autoFocus
            data-testid="input-electro-preset-name"
          />
          <button
            type="button"
            onClick={() => {
              const name = savePromptName.trim();
              if (!name) return;
              savePresetMutation.mutate(name);
            }}
            disabled={savePresetMutation.isPending || !savePromptName.trim()}
            className="text-[10px] px-2 py-1 rounded bg-teal-500/30 text-teal-100 border border-teal-500/50 hover:bg-teal-500/40 disabled:opacity-50"
            data-testid="button-confirm-save-electro-preset"
          >
            {savePresetMutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setSavePromptOpen(false); setSavePromptName(''); }}
            className="text-[10px] px-2 py-1 rounded bg-gray-800/60 text-gray-300 border border-gray-600/40 hover:bg-gray-800/90"
          >
            Cancel
          </button>
        </div>
      )}
      {renamingPresetId != null && (
        <div className="basis-full flex items-center gap-1.5 mt-1">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value.slice(0, 80))}
            placeholder="New name"
            className="flex-1 bg-gray-900/60 border border-gray-700/60 rounded px-2 py-1 text-[10px] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-teal-500/60"
            autoFocus
            data-testid="input-electro-preset-rename"
          />
          <button
            type="button"
            onClick={() => {
              const name = renameValue.trim();
              if (!name || renamingPresetId == null) return;
              renamePresetMutation.mutate({ id: renamingPresetId, name });
            }}
            disabled={renamePresetMutation.isPending || !renameValue.trim()}
            className="text-[10px] px-2 py-1 rounded bg-teal-500/30 text-teal-100 border border-teal-500/50 hover:bg-teal-500/40 disabled:opacity-50"
            data-testid="button-confirm-rename-electro-preset"
          >
            {renamePresetMutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setRenamingPresetId(null); setRenameValue(''); }}
            className="text-[10px] px-2 py-1 rounded bg-gray-800/60 text-gray-300 border border-gray-600/40 hover:bg-gray-800/90"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  const conditionContextSection = (
    <div className="border border-teal-500/30 rounded-lg bg-teal-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setShowContextEditor(v => !v)}
        className="w-full flex items-center gap-2 p-2 text-left hover:bg-teal-500/10 transition-colors"
      >
        <Stethoscope className="h-3.5 w-3.5 text-teal-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-teal-200">Condition & context</div>
          <div className="text-[9px] text-teal-300/60 truncate">
            {condition
              ? `${condition}${stage ? ` · ${stage}` : ''}${irritability ? ` · ${irritability} irritability` : ''}${primaryGoal ? ` · ${primaryGoal}` : ''}${contraindicationFlags.length ? ` · ${contraindicationFlags.length} contraindication${contraindicationFlags.length === 1 ? '' : 's'}` : ''}`
              : 'Optional — type a diagnosis (e.g. "Achilles tendinopathy") to drive the plan'}
          </div>
        </div>
        {showContextEditor ? <ChevronUp className="h-3 w-3 text-teal-300/70 shrink-0" /> : <ChevronDown className="h-3 w-3 text-teal-300/70 shrink-0" />}
      </button>
      {showContextEditor && (
        <div className="px-2 pb-2 pt-1 space-y-2 border-t border-teal-500/20">
          <div>
            <label className="text-[9px] text-teal-300/80 uppercase tracking-wider">Condition / diagnosis</label>
            <input
              type="text"
              value={condition}
              onChange={e => setCondition(e.target.value)}
              placeholder="e.g. Achilles tendinopathy, plantar fasciitis, lateral epicondylalgia…"
              className="mt-0.5 w-full bg-gray-900/60 border border-gray-700/60 rounded px-2 py-1 text-[10px] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-teal-500/60"
              data-testid="input-electro-condition"
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="text-[9px] text-teal-300/80 uppercase tracking-wider">Stage</label>
              <select value={stage} onChange={e => setStage(e.target.value as Stage)} className="mt-0.5 w-full bg-gray-900/60 border border-gray-700/60 rounded px-1 py-1 text-[10px] text-gray-100 focus:outline-none focus:border-teal-500/60">
                <option value="">—</option>
                <option value="acute">Acute</option>
                <option value="subacute">Subacute</option>
                <option value="chronic">Chronic</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-teal-300/80 uppercase tracking-wider">Irritability</label>
              <select value={irritability} onChange={e => setIrritability(e.target.value as Irritability)} className="mt-0.5 w-full bg-gray-900/60 border border-gray-700/60 rounded px-1 py-1 text-[10px] text-gray-100 focus:outline-none focus:border-teal-500/60">
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-teal-300/80 uppercase tracking-wider">Primary goal</label>
              <select value={primaryGoal} onChange={e => setPrimaryGoal(e.target.value as PrimaryGoal)} className="mt-0.5 w-full bg-gray-900/60 border border-gray-700/60 rounded px-1 py-1 text-[10px] text-gray-100 focus:outline-none focus:border-teal-500/60">
                <option value="">—</option>
                <option value="pain">Pain modulation</option>
                <option value="healing">Tissue healing</option>
                <option value="loading">Loading tolerance</option>
                <option value="mobility">Mobility</option>
                <option value="activation">Activation</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[9px] text-teal-300/80 uppercase tracking-wider">Tissue type (optional)</label>
            <input
              type="text"
              value={tissueType}
              onChange={e => setTissueType(e.target.value)}
              placeholder="e.g. tendon, ligament, muscle, joint capsule, nerve…"
              className="mt-0.5 w-full bg-gray-900/60 border border-gray-700/60 rounded px-2 py-1 text-[10px] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-teal-500/60"
            />
          </div>
          <div>
            <label className="text-[9px] text-red-300/80 uppercase tracking-wider flex items-center gap-1">
              <Shield className="h-2.5 w-2.5" /> Contraindication flags
            </label>
            <div className="mt-1 flex flex-wrap gap-1">
              {CONTRAINDICATION_OPTIONS.map(opt => {
                const active = contraindicationFlags.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleContraindication(opt.value)}
                    className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${active ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-gray-800/60 border-gray-700/60 text-gray-400 hover:text-gray-200'}`}
                    data-testid={`button-contraindication-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!hasData) {
    return (
      <div className="space-y-2">
        {presetsBar}
        {conditionContextSection}
        <div className="flex flex-col items-center justify-center py-6 px-4 text-center border border-gray-700/40 rounded-lg bg-gray-800/20">
          <Zap className="h-8 w-8 text-teal-400/60 mb-2" />
          <div className="text-[11px] text-gray-300 mb-1">Start with a diagnosis</div>
          <div className="text-[9px] text-gray-500 max-w-[280px]">
            Type a condition above (e.g. "Achilles tendinopathy") to generate a research-backed electrophysical plan, or place pain markers and run a mechanism analysis first.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-6 w-6 text-teal-400 animate-spin mb-3" />
        <div className="text-[11px] text-gray-300 mb-1">Generating electrophysical agents plan...</div>
        <div className="text-[9px] text-gray-500">AI is selecting optimal modalities based on tissue states and clinical findings</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <AlertTriangle className="h-6 w-6 text-red-400 mb-2" />
        <div className="text-[11px] text-red-300 mb-2">Failed to generate electrophysical plan</div>
        <div className="text-[9px] text-gray-400 mb-3">{error}</div>
        <button onClick={() => { void generatePlan(); }} className="px-3 py-1.5 text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded hover:bg-teal-500/30 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-2">
        {presetsBar}
        {conditionContextSection}
        <div className="flex flex-col items-center justify-center py-6 px-4 border border-gray-700/40 rounded-lg bg-gray-800/20">
          <Zap className="h-8 w-8 text-teal-400/60 mb-3" />
          <div className="text-[11px] text-gray-300 mb-1">AI Electrophysical Agents Prescription</div>
          <div className="text-[9px] text-gray-500 mb-4 text-center max-w-[260px]">
            {condition
              ? `Generate a research-backed electrophysical plan for "${condition}" with condition-specific dosages and citations.`
              : 'Generate a targeted electrophysical modality plan based on mechanism analysis, tissue irritability, and clinical findings — or type a condition above for a research-backed, diagnosis-specific plan.'}
          </div>
          <button onClick={() => { void generatePlan(); }} className="px-4 py-2 text-[11px] font-medium bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-lg hover:bg-teal-500/30 transition-colors flex items-center gap-2" data-testid="button-generate-electro-plan">
            <Zap className="h-3.5 w-3.5" />
            {condition ? `Generate plan for ${condition}` : 'Generate Electrophysical Plan'}
          </button>
        </div>
      </div>
    );
  }

  const totalModalities = plan.modalityGroups.reduce((sum, g) => sum + g.modalities.length, 0);

  const conditionLabel = (plan.conditionEcho || condition).trim();

  return (
    <div className="space-y-2">
      {presetsBar}
      {conditionContextSection}
      {plan.topPicks && plan.topPicks.length > 0 && (
        <div className="border border-emerald-500/40 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-2" data-testid="card-top-picks">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3 w-3 text-emerald-300" />
            <span className="text-[10px] font-semibold text-emerald-200">
              Top picks{conditionLabel ? ` for ${conditionLabel}` : ''}
            </span>
            <span className="text-[8px] text-emerald-300/60">({plan.topPicks.length})</span>
          </div>
          <div className="space-y-1">
            {plan.topPicks.map((pick, i) => {
              const grade = pick.evidenceGrade ? CONDITION_GRADE_STYLES[pick.evidenceGrade] : null;
              return (
                <div key={i} className="flex items-start gap-1.5 bg-gray-900/40 border border-emerald-500/20 rounded p-1.5">
                  <span className="text-[10px] font-mono text-emerald-300/70 mt-0.5 min-w-[14px]">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-gray-100">{pick.modality}</span>
                      {grade && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${grade.bg} ${grade.text} inline-flex items-center gap-0.5`}>
                          <Award className="h-2 w-2" />
                          {pick.evidenceGrade} · {grade.label}
                        </span>
                      )}
                    </div>
                    {pick.why && <div className="text-[9px] text-gray-300 mt-0.5 leading-snug">{pick.why}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-teal-400" />
          <span className="text-[11px] font-medium text-gray-200">
            {totalModalities} Modalities · {plan.modalityGroups.length} Groups
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => plan && fetchEvidence(plan)}
            disabled={evidenceLoading || !plan}
            className="px-2 py-1 text-[9px] bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded hover:bg-teal-500/20 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Re-fetch supporting research evidence for each modality"
          >
            {evidenceLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <BookOpen className="h-2.5 w-2.5" />}
            Refresh evidence
          </button>
          <button
            onClick={() => { void generatePlan(); }}
            className="px-2 py-1 text-[9px] bg-gray-700/40 text-gray-400 border border-gray-600/30 rounded hover:text-gray-200 hover:bg-gray-700/60 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            Regenerate
          </button>
        </div>
      </div>
      {evidenceError && (
        <div className="flex items-center justify-between gap-2 text-[9px] text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
          <span className="truncate">Evidence fetch failed: {evidenceError}</span>
          <button
            onClick={() => plan && fetchEvidence(plan)}
            disabled={evidenceLoading}
            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 disabled:opacity-50"
          >
            <RefreshCw className={`h-2.5 w-2.5 ${evidenceLoading ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
      )}

      {plan.modalityGroups.map(group => {
        const colors = GROUP_COLORS[group.goalTitle] ?? DEFAULT_COLORS;
        const Icon = GROUP_ICONS[group.goalTitle] ?? Zap;
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
                    P{group.priority} · {group.modalities.length} mod
                  </span>
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 truncate">{group.goalDescription}</div>
              </div>
              {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0" />}
            </button>
            {isExpanded && (
              <div className="p-2 space-y-1.5">
                {group.modalities.map((mod, i) => (
                  <ModalityCard
                    key={`${group.groupId}-${i}`}
                    modality={mod}
                    index={i}
                    evidence={evidenceMap[modalityKey(group.groupId, i)]}
                    evidenceLoading={evidenceLoading}
                    groupHint={`${group.groupId} ${group.goalTitle || ''}`}
                  />
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
            <span className="text-[10px] font-medium text-gray-300 flex-1">Clinical Notes & Safety Considerations</span>
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
                  <div className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider mb-1">Irritability & Safety Considerations</div>
                  <div className="text-[10px] text-amber-200/70 leading-relaxed">{plan.irritabilityConsiderations}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
