import { useState, useEffect, useRef, useCallback } from "react";
import {
  GripVertical,
  Brain,
  AlertTriangle,
  Stethoscope,
  Activity,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Target,
  Lightbulb,
  TrendingUp,
  X,
  Sparkles,
  Zap,
  Send,
  Dumbbell,
  Hand,
  Clock,
  ChevronRight,
  FileText,
  Home,
  AlertCircle,
  Crosshair,
  ArrowRight,
  ArrowDownRight,
  Pause,
  Play,
  Copy,
  ClipboardCheck,
  ScrollText,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import EvidenceCitationInline from "@/components/clinical/EvidenceCitationInline";
import StructuredReasoningTab, { type StructuredReasoningResult, type ReasoningHypothesis as StructuredHypothesis } from "./StructuredReasoningTab";

export interface EvidenceReference {
  title: string;
  authors: string;
  journal: string;
  year: number;
  pmid: string;
  doi?: string;
  abstract?: string;
  studyType: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D';
  pubmedUrl: string;
}

export interface ClinicalHypothesis {
  id: string;
  condition: string;
  confidence: number;
  supportingEvidence: string[];
  rulingOutFactors: string[];
  status: "active" | "ruled_out" | "confirmed";
}

export interface ClinicalFinding {
  id: string;
  category: "symptom" | "sign" | "history" | "aggravating" | "easing" | "functional";
  text: string;
  timestamp: number;
  isNew?: boolean;
}

export interface ClinicalFlag {
  id: string;
  type: "red" | "yellow" | "green";
  text: string;
  action: string;
}

export interface BiomechanicalLink {
  id: string;
  primaryRegion: string;
  connectedRegion: string;
  mechanism: string;
  clinicalRelevance: string;
}

export interface ReasoningStep {
  id: string;
  step: number;
  thought: string;
  type: "observation" | "hypothesis" | "deduction" | "recommendation";
  timestamp: number;
  isNew?: boolean;
}

export interface ManualTherapyTechnique {
  technique: string;
  target: string;
  dosage: string;
  reasoning: string;
  precautions?: string[];
}

export interface ExercisePrescription {
  name: string;
  target: string;
  dosage: string;
  progression: string;
  reasoning: string;
}

export interface TreatmentPhase {
  name: string;
  timeframe: string;
  goals: string[];
  manualTherapy: ManualTherapyTechnique[];
  exercises: ExercisePrescription[];
}

export interface RootCauseTreatment {
  primaryCause: string;
  contributingFactors: string[];
  targetedInterventions: {
    intervention: string;
    target: string;
    reasoning: string;
    frequency: string;
  }[];
}

export interface TreatmentPlan {
  phases: TreatmentPhase[];
  rootCauseTreatment: RootCauseTreatment;
  treatmentReasoning: string;
  prognosis: string;
  contraindications: string[];
  homeProgram: {
    exercise: string;
    dosage: string;
    instructions: string;
  }[];
}

export interface PosturalPainCorrelation {
  deviation: string;
  region: string;
  forceImpact: string;
  muscleEffect: string;
  painLink: string;
  severity: 'mild' | 'moderate' | 'significant';
  mechanism: string;
}

export interface PosturalAnalysis {
  summary: string;
  correlations: PosturalPainCorrelation[];
  compensatoryPatterns: string[];
  primaryPosturalDysfunction: string;
  recommendedCorrections: string[];
}

export interface VisualizationRequest {
  id: string;
  type: 'hypothesis' | 'rootCause' | 'treatment' | 'biomechanical' | 'painDriver';
  label: string;
  regions: string[];
  muscleHints: { muscle: string; status: 'weak' | 'tight' | 'overactive' | 'inhibited' | 'normal' }[];
}

export interface ClinicalReasoningData {
  hypotheses: ClinicalHypothesis[];
  findings: ClinicalFinding[];
  flags: ClinicalFlag[];
  biomechanicalLinks: BiomechanicalLink[];
  reasoningChain: ReasoningStep[];
  clinicalSummary: string;
  assessmentPriorities: string[];
  treatmentPlan?: TreatmentPlan | null;
  posturalAnalysis?: PosturalAnalysis | null;
  evidenceReferences?: EvidenceReference[];
}

interface ClinicalReasoningPanelProps {
  data: ClinicalReasoningData | null;
  isProcessing: boolean;
  isOpen: boolean;
  isPaused: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPauseToggle: () => void;
  onReset?: () => void;
  subjectiveHistory: string;
  onSubjectiveHistoryChange: (text: string) => void;
  onSubjectiveHistorySubmit: () => void;
  onBiomechanicalLinkClick?: (link: BiomechanicalLink | null) => void;
  activeBiomechanicalLinkId?: string | null;
  painDriverReports?: import("@/lib/painDriverEngine").PainDriverReport[];
  onVisualizationRequest?: (request: VisualizationRequest | null) => void;
  activeVisualizationId?: string | null;
  onHypothesisClick?: (hypothesis: ClinicalHypothesis) => void;
  structuredData?: StructuredReasoningResult | null;
  structuredLoading?: boolean;
  onStructuredHypothesisClick?: (hypothesis: StructuredHypothesis) => void;
}

const EMPTY_DATA: ClinicalReasoningData = {
  hypotheses: [],
  findings: [],
  flags: [],
  biomechanicalLinks: [],
  reasoningChain: [],
  clinicalSummary: "",
  assessmentPriorities: [],
  treatmentPlan: null,
  posturalAnalysis: null,
};

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 70
      ? "bg-teal-400"
      : value >= 40
        ? "bg-amber-400"
        : "bg-gray-500";
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-[9px] text-gray-400 w-7 text-right">{value}%</span>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  color,
  isOpen,
  onToggle,
}: {
  icon: any;
  title: string;
  count: number;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
          {title}
        </span>
        {count > 0 && (
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full ${color.replace("text-", "bg-").replace("400", "500/20")} ${color}`}
          >
            {count}
          </span>
        )}
      </div>
      {isOpen ? (
        <ChevronUp className="h-3 w-3 text-gray-500 group-hover:text-gray-300" />
      ) : (
        <ChevronDown className="h-3 w-3 text-gray-500 group-hover:text-gray-300" />
      )}
    </button>
  );
}

function TreatmentPhaseCard({ phase, idx, onVisualizationClick, activeVisualizationId, hasVisualization }: { phase: TreatmentPhase; idx: number; onVisualizationClick?: (id: string, type: VisualizationRequest['type'], label: string, text: string) => void; activeVisualizationId?: string | null; hasVisualization?: boolean }) {
  const [expanded, setExpanded] = useState(idx === 0);
  const phaseColors = ["from-teal-500/10 to-teal-600/5 border-teal-500/20", "from-blue-500/10 to-blue-600/5 border-blue-500/20", "from-purple-500/10 to-purple-600/5 border-purple-500/20"];
  const colorSet = phaseColors[idx % phaseColors.length];

  return (
    <div className={`rounded-lg border bg-gradient-to-br ${colorSet} overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-white/10 text-[9px] font-bold text-white">{idx + 1}</div>
          <div className="text-left">
            <p className="text-[10px] font-semibold text-white">{phase.name}</p>
            <p className="text-[9px] text-gray-400 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{phase.timeframe}</p>
          </div>
        </div>
        <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2">
          {phase.goals.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Goals</p>
              <div className="space-y-0.5">
                {phase.goals.map((g, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <Target className="h-2.5 w-2.5 text-teal-400 mt-0.5 flex-shrink-0" />
                    <span className="text-[10px] text-gray-300">{g}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {phase.manualTherapy.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Hand className="h-2.5 w-2.5" />Manual Therapy</p>
              <div className="space-y-1.5">
                {phase.manualTherapy.map((mt, i) => {
                  const mtVizId = `tx-mt-${idx}-${i}`;
                  const mtActive = activeVisualizationId === mtVizId;
                  const mtText = `${mt.technique} ${mt.target} ${mt.reasoning} ${mt.dosage}`;
                  return (
                  <div
                    key={i}
                    className={`rounded p-2 border transition-colors ${onVisualizationClick ? 'cursor-pointer' : ''} ${mtActive ? 'bg-emerald-900/20 border-emerald-500/30 ring-1 ring-emerald-500/15' : 'bg-black/20 border-white/5 hover:border-cyan-500/20'}`}
                    onClick={() => onVisualizationClick?.(mtVizId, 'treatment', mt.technique, mtText)}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-[10px] font-medium text-cyan-300">{mt.technique}</p>
                      {hasVisualization && (
                        <span className={`p-0.5 shrink-0 ${mtActive ? 'text-emerald-400' : 'text-gray-600'}`}>
                          {mtActive ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-gray-500">Target: <span className="text-gray-400">{mt.target}</span></span>
                      <span className="text-[9px] text-gray-500">Dose: <span className="text-gray-400">{mt.dosage}</span></span>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 italic">{mt.reasoning}</p>
                    {mt.precautions && mt.precautions.length > 0 && (
                      <div className="mt-1 flex items-start gap-1">
                        <AlertCircle className="h-2.5 w-2.5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[9px] text-amber-400/80">{mt.precautions.join('; ')}</span>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
          {phase.exercises.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Dumbbell className="h-2.5 w-2.5" />Exercises</p>
              <div className="space-y-1.5">
                {phase.exercises.map((ex, i) => {
                  const exVizId = `tx-ex-${idx}-${i}`;
                  const exActive = activeVisualizationId === exVizId;
                  const exText = `${ex.name} ${ex.target} ${ex.reasoning} ${ex.dosage} ${ex.progression || ''}`;
                  return (
                  <div
                    key={i}
                    className={`rounded p-2 border transition-colors ${onVisualizationClick ? 'cursor-pointer' : ''} ${exActive ? 'bg-emerald-900/20 border-emerald-500/30 ring-1 ring-emerald-500/15' : 'bg-black/20 border-white/5 hover:border-cyan-500/20'}`}
                    onClick={() => onVisualizationClick?.(exVizId, 'treatment', ex.name, exText)}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-[10px] font-medium text-green-300">{ex.name}</p>
                      {hasVisualization && (
                        <span className={`p-0.5 shrink-0 ${exActive ? 'text-emerald-400' : 'text-gray-600'}`}>
                          {exActive ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-gray-500">Target: <span className="text-gray-400">{ex.target}</span></span>
                      <span className="text-[9px] text-gray-500">Dose: <span className="text-gray-400">{ex.dosage}</span></span>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 italic">{ex.reasoning}</p>
                    {ex.progression && <p className="text-[9px] text-teal-400/70 mt-0.5">Progression: {ex.progression}</p>}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClinicalReasoningPanel({
  data,
  isProcessing,
  isOpen,
  isPaused,
  onToggle,
  onClose,
  onPauseToggle,
  onReset,
  subjectiveHistory,
  onSubjectiveHistoryChange,
  onSubjectiveHistorySubmit,
  onBiomechanicalLinkClick,
  activeBiomechanicalLinkId,
  painDriverReports,
  onVisualizationRequest,
  activeVisualizationId,
  onHypothesisClick,
  structuredData,
  structuredLoading,
  onStructuredHypothesisClick,
}: ClinicalReasoningPanelProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'structured'>('analysis');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hypotheses: true,
    findings: true,
    flags: true,
    painDrivers: true,
    biomechanical: false,
    reasoning: true,
    priorities: false,
    treatment: true,
    postural: true,
    clinicalNotes: true,
  });

  const [clinicalNotes, setClinicalNotes] = useState<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    additionalNotes: string;
    generatedAt: string;
  } | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const d = data || EMPTY_DATA;
  const hasContent =
    d.hypotheses.length > 0 ||
    d.findings.length > 0 ||
    d.flags.length > 0 ||
    d.reasoningChain.length > 0 ||
    d.treatmentPlan !== null && d.treatmentPlan !== undefined;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (subjectiveHistory.trim()) {
        onSubjectiveHistorySubmit();
      }
    }
  }, [subjectiveHistory, onSubjectiveHistorySubmit]);

  const extractRegionsFromText = useCallback((text: string): string[] => {
    const lower = text.toLowerCase();
    const regionKeywords = [
      'shoulder', 'knee', 'hip', 'ankle', 'neck', 'cervical', 'thoracic', 'lumbar',
      'low back', 'elbow', 'wrist', 'foot', 'sacroiliac', 'pelvis', 'spine',
      'scapula', 'calf', 'hamstring', 'quadriceps', 'glute', 'groin', 'forearm',
      'rotator cuff', 'supraspinatus', 'infraspinatus', 'subscapularis', 'deltoid',
      'trapezius', 'pectoralis', 'biceps', 'triceps', 'latissimus', 'rhomboid',
      'piriformis', 'psoas', 'iliacus', 'gastrocnemius', 'soleus', 'tibialis',
      'achilles', 'plantar', 'patella', 'meniscus', 'labrum', 'acl', 'mcl',
    ];
    const found: string[] = [];
    for (const r of regionKeywords) {
      if (lower.includes(r) && !found.includes(r)) found.push(r);
    }
    return found.slice(0, 6);
  }, []);

  const extractMuscleHints = useCallback((text: string): VisualizationRequest['muscleHints'] => {
    const lower = text.toLowerCase();
    const hints: VisualizationRequest['muscleHints'] = [];
    const patterns: { keywords: string[]; status: 'weak' | 'tight' | 'overactive' | 'inhibited' }[] = [
      { keywords: ['inhibited', 'inhibition', 'suppressed'], status: 'inhibited' },
      { keywords: ['overactive', 'hyperactive', 'spasm', 'hypertonic'], status: 'overactive' },
      { keywords: ['weak', 'weakness', 'underactive', 'atrophy'], status: 'weak' },
      { keywords: ['tight', 'tightness', 'shortened', 'contracture', 'stiff', 'restricted'], status: 'tight' },
    ];
    const muscleNames = [
      'deltoid', 'trapezius', 'rotator cuff', 'supraspinatus', 'infraspinatus',
      'subscapularis', 'pectoralis', 'biceps', 'triceps', 'latissimus',
      'rhomboid', 'serratus', 'levator scapulae', 'sternocleidomastoid',
      'scalene', 'upper trapezius', 'lower trapezius', 'middle trapezius',
      'gluteus maximus', 'gluteus medius', 'gluteus minimus', 'piriformis',
      'psoas', 'iliacus', 'hip flexor', 'tensor fasciae latae', 'tfl',
      'quadriceps', 'rectus femoris', 'vastus lateralis', 'vastus medialis',
      'hamstring', 'biceps femoris', 'semitendinosus', 'semimembranosus',
      'gastrocnemius', 'soleus', 'tibialis anterior', 'tibialis posterior',
      'peroneal', 'adductor', 'abductor', 'erector spinae', 'multifidus',
      'transverse abdominis', 'oblique', 'rectus abdominis', 'diaphragm',
    ];
    for (const muscle of muscleNames) {
      if (lower.includes(muscle)) {
        let foundStatus: 'weak' | 'tight' | 'overactive' | 'inhibited' | 'normal' = 'normal';
        const idx = lower.indexOf(muscle);
        const context = lower.substring(Math.max(0, idx - 60), Math.min(lower.length, idx + muscle.length + 60));
        for (const p of patterns) {
          if (p.keywords.some(k => context.includes(k))) {
            foundStatus = p.status;
            break;
          }
        }
        hints.push({ muscle, status: foundStatus });
      }
    }
    return hints.slice(0, 8);
  }, []);

  const handleVisualizationClick = useCallback((id: string, type: VisualizationRequest['type'], label: string, textForParsing: string, explicitRegions?: string[]) => {
    if (!onVisualizationRequest) return;
    if (activeVisualizationId === id) {
      onVisualizationRequest(null);
      return;
    }
    const parsedRegions = extractRegionsFromText(textForParsing);
    const regions = explicitRegions
      ? Array.from(new Set([...explicitRegions, ...parsedRegions]))
      : parsedRegions;
    const muscleHints = extractMuscleHints(textForParsing);
    onVisualizationRequest({ id, type, label, regions, muscleHints });
  }, [onVisualizationRequest, activeVisualizationId, extractRegionsFromText, extractMuscleHints]);

  const generateClinicalNotes = useCallback(async () => {
    if (!hasContent || isGeneratingNotes) return;
    setIsGeneratingNotes(true);
    try {
      const notes = await apiRequest("/api/clinical-notes/generate", "POST", {
        reasoningData: d,
        subjectiveHistory,
      });
      setClinicalNotes(notes);
    } catch (err) {
      console.error("Failed to generate clinical notes:", err);
    } finally {
      setIsGeneratingNotes(false);
    }
  }, [d, subjectiveHistory, hasContent, isGeneratingNotes]);

  const copySection = useCallback((sectionName: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  }, []);

  const copyAllNotes = useCallback(() => {
    if (!clinicalNotes) return;
    const fullText = `SUBJECTIVE:\n${clinicalNotes.subjective}\n\nOBJECTIVE:\n${clinicalNotes.objective}\n\nASSESSMENT:\n${clinicalNotes.assessment}\n\nPLAN:\n${clinicalNotes.plan}${clinicalNotes.additionalNotes ? `\n\nADDITIONAL NOTES:\n${clinicalNotes.additionalNotes}` : ''}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedSection('all');
      setTimeout(() => setCopiedSection(null), 2000);
    });
  }, [clinicalNotes]);

  useEffect(() => {
    if (scrollRef.current && hasContent) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isNearBottom) {
        setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 100);
      }
    }
  }, [d.reasoningChain.length, d.findings.length, hasContent]);

  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select, [role="button"]')) return;
    e.preventDefault();
    const panelEl = panelRef.current;
    if (!panelEl) return;
    const rect = panelEl.getBoundingClientRect();
    const parentRect = panelEl.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    dragOffset.current = {
      x: e.clientX - rect.left + parentRect.left,
      y: e.clientY - rect.top + parentRect.top,
    };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const panelEl = panelRef.current;
      if (!panelEl) return;
      const parent = panelEl.offsetParent as HTMLElement | null;
      const parentRect = parent?.getBoundingClientRect() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const panelW = 340;
      let left = e.clientX - dragOffset.current.x;
      let top = e.clientY - dragOffset.current.y;
      left = Math.max(0, Math.min(left, parentRect.width - panelW));
      top = Math.max(0, Math.min(top, parentRect.height - 100));
      setDragPos({ left, top });
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  const tp = d.treatmentPlan;
  const pa = d.posturalAnalysis;

  const panelStyle: React.CSSProperties = dragPos
    ? { left: dragPos.left, top: dragPos.top, right: 'auto', bottom: 'auto', height: `calc(100% - ${dragPos.top}px)` }
    : {};

  return (
    <div
      ref={panelRef}
      className={`absolute z-30 w-[340px] ${dragPos ? '' : 'top-0 right-0 h-full animate-in slide-in-from-right-2 duration-300'}`}
      style={panelStyle}
    >
      <div className={`h-full bg-gray-950/95 backdrop-blur-xl border-l border-cyan-500/20 flex flex-col shadow-2xl shadow-cyan-500/5 ${dragPos ? 'rounded-lg border border-cyan-500/20' : ''}`}>
        <div
          className={`flex items-center justify-between px-3 py-2.5 border-b border-white/10 bg-gradient-to-r from-cyan-900/20 to-transparent select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
            <div className="p-1 bg-gradient-to-br from-cyan-500 to-blue-600 rounded">
              <Brain className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-white text-xs">Clinical Reasoning</span>
              <p className="text-[9px] text-gray-500">AI-powered analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isPaused && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Pause className="h-2.5 w-2.5 text-amber-400" />
                <span className="text-[9px] text-amber-400">Paused</span>
              </div>
            )}
            {isProcessing && !isPaused && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <Loader2 className="h-2.5 w-2.5 animate-spin text-cyan-400" />
                <span className="text-[9px] text-cyan-400">Analyzing</span>
              </div>
            )}
            {activeVisualizationId && onVisualizationRequest && (
              <button
                onClick={() => onVisualizationRequest(null)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors group"
                title="Clear skeleton visualization"
              >
                <Eye className="h-2.5 w-2.5 text-emerald-400" />
                <span className="text-[9px] text-emerald-400">Showing</span>
                <X className="h-2 w-2 text-emerald-400/60 group-hover:text-emerald-300" />
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-cyan-400 transition-colors"
                title="Reset & restart analysis"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onPauseToggle}
              className={`p-1 rounded hover:bg-white/10 transition-colors ${isPaused ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-white'}`}
              title={isPaused ? 'Resume AI analysis' : 'Pause AI analysis'}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="px-2 py-2 border-b border-white/5">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={subjectiveHistory}
              onChange={(e) => onSubjectiveHistoryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add subjective history... (e.g., 'Patient is 45yo desk worker, pain worse in morning, history of diabetes')"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-2.5 py-2 pr-8 text-[10px] text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              rows={2}
            />
            <button
              onClick={() => { if (subjectiveHistory.trim()) onSubjectiveHistorySubmit(); }}
              disabled={!subjectiveHistory.trim() || isProcessing}
              className="absolute bottom-2.5 right-2 p-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
          <p className="text-[8px] text-gray-600 mt-1 px-1">Press Enter to submit, Shift+Enter for new line</p>
        </div>

        <div className="flex items-center border-b border-white/5 px-2">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${activeTab === 'analysis' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            <Brain className="h-3 w-3" />
            Analysis
          </button>
          <button
            onClick={() => setActiveTab('structured')}
            className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${activeTab === 'structured' ? 'text-violet-400 border-violet-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            <Lightbulb className="h-3 w-3" />
            Structured
            {structuredData && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-violet-400" />}
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
          {activeTab === 'structured' ? (
            <StructuredReasoningTab
              data={structuredData ?? null}
              isLoading={structuredLoading ?? false}
              onHypothesisClick={onStructuredHypothesisClick}
            />
          ) : (
          <>
          {!hasContent && !isProcessing && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="p-3 rounded-full bg-cyan-500/10 mb-3">
                <Brain className="h-6 w-6 text-cyan-500/50" />
              </div>
              <p className="text-xs text-gray-400 mb-1">Waiting for clinical data</p>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                Place pain markers, adjust the skeleton, or add subjective history above to trigger AI analysis
              </p>
            </div>
          )}

          {!hasContent && isProcessing && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mb-3" />
              <p className="text-xs text-gray-400">Analyzing clinical data...</p>
            </div>
          )}

          {d.flags.length > 0 && (
            <div>
              <SectionHeader
                icon={Shield}
                title="Clinical Flags"
                count={d.flags.length}
                color={d.flags.some((f) => f.type === "red") ? "text-red-400" : "text-amber-400"}
                isOpen={expandedSections.flags}
                onToggle={() => toggleSection("flags")}
              />
              {expandedSections.flags && (
                <div className="space-y-1 mt-1 ml-1">
                  {d.flags.map((flag) => (
                    <div
                      key={flag.id}
                      className={`rounded-lg p-2 border ${
                        flag.type === "red"
                          ? "bg-red-500/10 border-red-500/30"
                          : flag.type === "yellow"
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-green-500/10 border-green-500/30"
                      } animate-in fade-in-0 slide-in-from-right-1 duration-300`}
                    >
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle
                          className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                            flag.type === "red"
                              ? "text-red-400"
                              : flag.type === "yellow"
                                ? "text-amber-400"
                                : "text-green-400"
                          }`}
                        />
                        <div>
                          <p className="text-[10px] font-medium text-gray-200">{flag.text}</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">{flag.action}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {d.hypotheses.length > 0 && (
            <div>
              <SectionHeader
                icon={Stethoscope}
                title="Working Hypotheses"
                count={d.hypotheses.length}
                color="text-teal-400"
                isOpen={expandedSections.hypotheses}
                onToggle={() => toggleSection("hypotheses")}
              />
              {expandedSections.hypotheses && (
                <div className="space-y-1.5 mt-1 ml-1">
                  {d.hypotheses
                    .filter((h) => h.status !== "ruled_out")
                    .sort((a, b) => b.confidence - a.confidence)
                    .map((hypothesis, idx) => {
                      const vizId = `hyp-${hypothesis.id}`;
                      const isVizActive = activeVisualizationId === vizId;
                      const fullText = [hypothesis.condition, ...hypothesis.supportingEvidence, ...hypothesis.rulingOutFactors].join(' ');
                      return (
                      <div
                        key={hypothesis.id}
                        className={`rounded-lg p-2 border animate-in fade-in-0 slide-in-from-right-1 duration-300 transition-colors cursor-pointer ${isVizActive ? 'bg-emerald-900/30 border-emerald-500/40 ring-1 ring-emerald-500/20' : 'bg-gray-800/40 border-gray-700/30 hover:border-cyan-500/30'}`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                        onClick={() => { if (onHypothesisClick) { onHypothesisClick(hypothesis); } else { handleVisualizationClick(vizId, 'hypothesis', hypothesis.condition, fullText); } }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] font-bold text-teal-400/70">#{idx + 1}</span>
                            <p className="text-[10px] font-medium text-gray-200 truncate">
                              {hypothesis.condition}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {hypothesis.status === "confirmed" && (
                              <span className="text-[8px] px-1 py-0.5 bg-teal-500/20 text-teal-400 rounded">
                                Confirmed
                              </span>
                            )}
                            {onVisualizationRequest && (
                              <span
                                className={`p-0.5 rounded transition-colors cursor-pointer ${isVizActive ? 'text-emerald-400' : 'text-gray-600 hover:text-cyan-400'}`}
                                title="Visualize on skeleton"
                                onClick={(e) => { e.stopPropagation(); handleVisualizationClick(vizId, 'hypothesis', hypothesis.condition, fullText); }}
                              >
                                {isVizActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </div>
                        <ConfidenceBar value={hypothesis.confidence} />
                        {hypothesis.supportingEvidence.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {hypothesis.supportingEvidence.map((ev, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <span className="text-teal-500 text-[8px] mt-0.5">+</span>
                                <span className="text-[9px] text-gray-400">{ev}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {hypothesis.rulingOutFactors.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {hypothesis.rulingOutFactors.map((rf, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <span className="text-red-500 text-[8px] mt-0.5">-</span>
                                <span className="text-[9px] text-gray-500">{rf}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  {d.hypotheses.filter((h) => h.status === "ruled_out").length > 0 && (
                    <div className="mt-1">
                      <p className="text-[9px] text-gray-600 mb-1">Ruled Out:</p>
                      {d.hypotheses
                        .filter((h) => h.status === "ruled_out")
                        .map((h) => (
                          <span
                            key={h.id}
                            className="inline-block text-[9px] text-gray-600 line-through mr-2"
                          >
                            {h.condition}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {d.findings.length > 0 && (
            <div>
              <SectionHeader
                icon={Target}
                title="Key Findings"
                count={d.findings.length}
                color="text-blue-400"
                isOpen={expandedSections.findings}
                onToggle={() => toggleSection("findings")}
              />
              {expandedSections.findings && (
                <div className="space-y-0.5 mt-1 ml-1">
                  {d.findings.map((finding, idx) => {
                    const categoryColors: Record<string, string> = {
                      symptom: "text-orange-400 bg-orange-500/10",
                      sign: "text-blue-400 bg-blue-500/10",
                      history: "text-purple-400 bg-purple-500/10",
                      aggravating: "text-red-400 bg-red-500/10",
                      easing: "text-green-400 bg-green-500/10",
                      functional: "text-cyan-400 bg-cyan-500/10",
                    };
                    const colors = categoryColors[finding.category] || "text-gray-400 bg-gray-500/10";
                    const fVizId = `finding-${finding.id}`;
                    const fActive = activeVisualizationId === fVizId;
                    return (
                      <div
                        key={finding.id}
                        className={`flex items-start gap-1.5 px-2 py-1 rounded transition-colors ${onVisualizationRequest ? 'cursor-pointer' : ''} ${fActive ? 'bg-emerald-900/20 ring-1 ring-emerald-500/20' : ''} ${finding.isNew ? "animate-in fade-in-0 slide-in-from-right-2 duration-500 bg-blue-500/5" : "hover:bg-white/5"}`}
                        onClick={() => handleVisualizationClick(fVizId, 'hypothesis', finding.text.substring(0, 40), finding.text)}
                      >
                        <span
                          className={`text-[8px] px-1 py-0.5 rounded mt-0.5 flex-shrink-0 ${colors}`}
                        >
                          {finding.category.charAt(0).toUpperCase() + finding.category.slice(1)}
                        </span>
                        <span className="text-[10px] text-gray-300 flex-1">{finding.text}</span>
                        {onVisualizationRequest && (
                          <span className={`p-0.5 shrink-0 mt-0.5 ${fActive ? 'text-emerald-400' : 'text-gray-600'}`}>
                            {fActive ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {painDriverReports && painDriverReports.length > 0 && (
            <div>
              <SectionHeader
                icon={Crosshair}
                title="Pain Driver Report"
                count={painDriverReports.reduce((sum, r) => sum + r.drivers.length, 0)}
                color="text-rose-400"
                isOpen={expandedSections.painDrivers}
                onToggle={() => toggleSection("painDrivers")}
              />
              {expandedSections.painDrivers && (
                <div className="space-y-2 mt-1 ml-1">
                  {painDriverReports.map((report) => {
                    const severityColors: Record<string, string> = {
                      critical: 'text-red-400 bg-red-500/20 border-red-500/30',
                      high: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
                      moderate: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
                      low: 'text-green-400 bg-green-500/20 border-green-500/30',
                    };
                    const categoryIcons: Record<string, string> = {
                      structural: '🦴',
                      biomechanical: '⚙️',
                      myofascial: '💪',
                      fascial_chain: '🔗',
                      scar_tissue: '🩹',
                      referred: '↗️',
                      compensatory: '🔄',
                    };
                    return (
                      <div key={report.markerId} className="rounded-lg border border-rose-500/20 bg-gray-800/40 p-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Crosshair className="h-3 w-3 text-rose-400" />
                          <span className="text-[11px] font-semibold text-rose-300">{report.region}</span>
                          <span className="text-[9px] text-gray-500 ml-auto">{report.totalDriverCount} driver{report.totalDriverCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="space-y-1">
                          {(expandedSections[`drivers_${report.markerId}`] ? report.drivers : report.drivers.slice(0, 5)).map((driver, idx) => {
                            const colors = severityColors[driver.severity] || severityColors.low;
                            const driverVizId = `paindriver-${driver.id}`;
                            const driverActive = activeVisualizationId === driverVizId;
                            const driverText = `${driver.label} ${driver.mechanism} ${driver.relatedStructures.join(' ')}`;
                            return (
                              <div
                                key={driver.id}
                                className={`rounded p-1.5 border transition-colors ${onVisualizationRequest ? 'cursor-pointer' : ''} ${driverActive ? 'bg-emerald-900/30 border-emerald-500/40 ring-1 ring-emerald-500/20' : `${colors} bg-opacity-30 hover:brightness-125`}`}
                                onClick={() => handleVisualizationClick(driverVizId, 'painDriver', driver.label, driverText, driver.relatedStructures)}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px]">{categoryIcons[driver.category] || '•'}</span>
                                  <span className="text-[10px] font-medium flex-1">{driver.label}</span>
                                  <span className="text-[8px] px-1 py-0.5 rounded bg-gray-900/50 text-gray-400">#{idx + 1}</span>
                                  <span className="text-[8px] font-mono">{driver.evidenceScore}%</span>
                                  {onVisualizationRequest && (
                                    <span className={`flex-shrink-0 ${driverActive ? 'text-emerald-400' : 'text-gray-500'}`}>
                                      {driverActive ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-gray-400 mt-0.5">{driver.mechanism}</p>
                              </div>
                            );
                          })}
                          {report.drivers.length > 5 && (
                            <button
                              className="text-[9px] text-rose-400 hover:text-rose-300 w-full text-center py-0.5"
                              onClick={() => toggleSection(`drivers_${report.markerId}`)}
                            >
                              {expandedSections[`drivers_${report.markerId}`] ? 'Show less' : `Show all ${report.drivers.length} drivers`}
                            </button>
                          )}
                        </div>
                        {report.narrative && (
                          <p className="text-[9px] text-gray-500 mt-1.5 italic border-t border-gray-700/30 pt-1">{report.narrative}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {d.biomechanicalLinks.length > 0 && (
            <div>
              <SectionHeader
                icon={GitBranch}
                title="Biomechanical Links"
                count={d.biomechanicalLinks.length}
                color="text-purple-400"
                isOpen={expandedSections.biomechanical}
                onToggle={() => toggleSection("biomechanical")}
              />
              {expandedSections.biomechanical && (
                <div className="space-y-1 mt-1 ml-1">
                  {d.biomechanicalLinks.map((link) => {
                    const isActive = activeBiomechanicalLinkId === link.id;
                    return (
                      <div
                        key={link.id}
                        onClick={() => {
                          if (onBiomechanicalLinkClick) {
                            onBiomechanicalLinkClick(isActive ? null : link);
                          }
                        }}
                        className={`rounded-lg p-2 border animate-in fade-in-0 duration-300 transition-all ${
                          onBiomechanicalLinkClick ? 'cursor-pointer' : ''
                        } ${
                          isActive
                            ? 'bg-cyan-500/15 border-cyan-500/40 ring-1 ring-cyan-500/30'
                            : 'bg-gray-800/30 border-purple-500/10 hover:bg-purple-500/10 hover:border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className={isActive ? 'text-cyan-300 font-medium' : 'text-purple-300 font-medium'}>{link.primaryRegion}</span>
                          <Zap className={`h-2.5 w-2.5 ${isActive ? 'text-cyan-400' : 'text-purple-500'}`} />
                          <span className={isActive ? 'text-cyan-300 font-medium' : 'text-purple-300 font-medium'}>{link.connectedRegion}</span>
                          {isActive && (
                            <span className="ml-auto text-[8px] text-cyan-400/70 uppercase tracking-wider">showing</span>
                          )}
                        </div>
                        <p className="text-[9px] text-gray-500 mt-0.5">{link.mechanism}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5 italic">{link.clinicalRelevance}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {d.reasoningChain.length > 0 && (
            <div>
              <SectionHeader
                icon={Lightbulb}
                title="Reasoning Chain"
                count={d.reasoningChain.length}
                color="text-amber-400"
                isOpen={expandedSections.reasoning}
                onToggle={() => toggleSection("reasoning")}
              />
              {expandedSections.reasoning && (
                <div className="mt-1 ml-1 relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-500/30 via-cyan-500/20 to-transparent" />
                  <div className="space-y-1.5">
                    {d.reasoningChain.map((step, idx) => {
                      const typeIcons: Record<string, { icon: any; color: string }> = {
                        observation: { icon: Target, color: "text-blue-400 bg-blue-500/20" },
                        hypothesis: { icon: Lightbulb, color: "text-amber-400 bg-amber-500/20" },
                        deduction: { icon: Brain, color: "text-cyan-400 bg-cyan-500/20" },
                        recommendation: { icon: Sparkles, color: "text-teal-400 bg-teal-500/20" },
                      };
                      const typeConfig = typeIcons[step.type] || typeIcons.observation;
                      const StepIcon = typeConfig.icon;
                      return (
                        <div
                          key={step.id}
                          className={`flex items-start gap-2 pl-1 ${step.isNew ? "animate-in fade-in-0 slide-in-from-right-2 duration-500" : ""}`}
                        >
                          <div
                            className={`p-0.5 rounded flex-shrink-0 mt-0.5 ${typeConfig.color}`}
                          >
                            <StepIcon className="h-2.5 w-2.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-300 leading-relaxed">
                              {step.thought}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {pa && (pa.correlations?.length > 0 || pa.summary) && (
            <div>
              <SectionHeader
                icon={Crosshair}
                title="Postural-Pain Correlation"
                count={pa.correlations?.length || 0}
                color="text-rose-400"
                isOpen={expandedSections.postural}
                onToggle={() => toggleSection("postural")}
              />
              {expandedSections.postural && (
                <div className="space-y-2 mt-1 ml-1">
                  {pa.primaryPosturalDysfunction && (
                    <div className="bg-rose-500/5 rounded-lg p-2 border border-rose-500/10">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Primary Dysfunction</p>
                      <p className="text-[10px] font-medium text-rose-300">{pa.primaryPosturalDysfunction}</p>
                    </div>
                  )}

                  {pa.summary && (
                    <div className="bg-rose-500/5 rounded-lg p-2 border border-rose-500/10">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Postural Analysis</p>
                      <p className="text-[10px] text-gray-300 leading-relaxed">{pa.summary}</p>
                    </div>
                  )}

                  {pa.correlations && pa.correlations.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider px-1">Cause &rarr; Effect Chain</p>
                      {pa.correlations.map((corr, idx) => {
                        const severityColors = {
                          mild: 'border-yellow-500/20 bg-yellow-500/5',
                          moderate: 'border-orange-500/20 bg-orange-500/5',
                          significant: 'border-red-500/20 bg-red-500/5',
                        };
                        const severityBadge = {
                          mild: 'text-yellow-400 bg-yellow-500/15',
                          moderate: 'text-orange-400 bg-orange-500/15',
                          significant: 'text-red-400 bg-red-500/15',
                        };
                        return (
                          <div key={idx} className={`rounded-lg p-2 border ${severityColors[corr.severity] || severityColors.moderate}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <Crosshair className="h-2.5 w-2.5 text-rose-400" />
                                <span className="text-[10px] font-medium text-rose-300">{corr.deviation}</span>
                              </div>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${severityBadge[corr.severity] || severityBadge.moderate}`}>
                                {corr.severity}
                              </span>
                            </div>
                            <div className="space-y-1 mt-1.5">
                              <div className="flex items-start gap-1.5">
                                <ArrowRight className="h-2.5 w-2.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[8px] text-amber-500 uppercase">Force Impact</span>
                                  <p className="text-[9px] text-gray-300">{corr.forceImpact}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <ArrowDownRight className="h-2.5 w-2.5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[8px] text-purple-500 uppercase">Muscle Effect</span>
                                  <p className="text-[9px] text-gray-300">{corr.muscleEffect}</p>
                                </div>
                              </div>
                              {corr.painLink && (
                                <div className="flex items-start gap-1.5">
                                  <Zap className="h-2.5 w-2.5 text-red-400 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-[8px] text-red-500 uppercase">Pain Connection</span>
                                    <p className="text-[9px] text-gray-300">{corr.painLink}</p>
                                  </div>
                                </div>
                              )}
                              <div className="bg-black/20 rounded p-1 mt-0.5">
                                <span className="text-[8px] text-gray-500 uppercase">Mechanism</span>
                                <p className="text-[9px] text-gray-400 italic">{corr.mechanism}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {pa.compensatoryPatterns && pa.compensatoryPatterns.length > 0 && (
                    <div className="bg-violet-500/5 rounded-lg p-2 border border-violet-500/10">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Compensatory Patterns</p>
                      <div className="space-y-0.5">
                        {pa.compensatoryPatterns.map((pattern, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <span className="text-violet-500 text-[8px] mt-0.5">&bull;</span>
                            <span className="text-[9px] text-gray-400">{pattern}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pa.recommendedCorrections && pa.recommendedCorrections.length > 0 && (
                    <div className="bg-teal-500/5 rounded-lg p-2 border border-teal-500/10">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Postural Corrections</p>
                      <div className="space-y-0.5">
                        {pa.recommendedCorrections.map((corr, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <span className="text-teal-500 text-[8px] mt-0.5">{i + 1}.</span>
                            <span className="text-[9px] text-gray-300">{corr}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tp && (
            <div>
              <SectionHeader
                icon={FileText}
                title="Treatment Plan"
                count={tp.phases?.length || 0}
                color="text-emerald-400"
                isOpen={expandedSections.treatment}
                onToggle={() => toggleSection("treatment")}
              />
              {expandedSections.treatment && (
                <div className="space-y-2 mt-1 ml-1">
                  {tp.treatmentReasoning && (
                    <div className="bg-emerald-500/5 rounded-lg p-2 border border-emerald-500/10">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Treatment Rationale</p>
                      <p className="text-[10px] text-gray-300 leading-relaxed">{tp.treatmentReasoning}</p>
                    </div>
                  )}

                  {tp.rootCauseTreatment && (() => {
                    const rcVizId = 'rootcause-primary';
                    const rcActive = activeVisualizationId === rcVizId;
                    const rcFullText = [tp.rootCauseTreatment.primaryCause, ...tp.rootCauseTreatment.contributingFactors, ...tp.rootCauseTreatment.targetedInterventions.map(t => `${t.intervention} ${t.target} ${t.reasoning}`)].join(' ');
                    return (
                    <div
                      className={`rounded-lg p-2 border transition-colors cursor-pointer ${rcActive ? 'bg-emerald-900/30 border-emerald-500/40 ring-1 ring-emerald-500/20' : 'bg-orange-500/5 border-orange-500/10 hover:border-orange-500/30'}`}
                      onClick={() => handleVisualizationClick(rcVizId, 'rootCause', tp.rootCauseTreatment.primaryCause, rcFullText)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5 text-orange-400" />Root Cause
                        </p>
                        {onVisualizationRequest && (
                          <span className={`p-0.5 rounded transition-colors ${rcActive ? 'text-emerald-400' : 'text-gray-600'}`}>
                            {rcActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-orange-300">{tp.rootCauseTreatment.primaryCause}</p>
                      {tp.rootCauseTreatment.contributingFactors.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {tp.rootCauseTreatment.contributingFactors.map((f, i) => (
                            <div key={i} className="flex items-start gap-1">
                              <span className="text-orange-500 text-[8px] mt-0.5">+</span>
                              <span className="text-[9px] text-gray-400">{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {tp.rootCauseTreatment.targetedInterventions.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {tp.rootCauseTreatment.targetedInterventions.map((ti, i) => (
                            <div key={i} className="bg-black/20 rounded p-1.5 border border-white/5">
                              <p className="text-[10px] font-medium text-orange-200">{ti.intervention}</p>
                              <p className="text-[9px] text-gray-500">Target: {ti.target} | {ti.frequency}</p>
                              <p className="text-[9px] text-gray-500 italic mt-0.5">{ti.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })()}

                  {tp.phases && tp.phases.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider px-1">Phase-Based Plan</p>
                      {tp.phases.map((phase, idx) => (
                        <TreatmentPhaseCard key={idx} phase={phase} idx={idx} onVisualizationClick={handleVisualizationClick} activeVisualizationId={activeVisualizationId} hasVisualization={!!onVisualizationRequest} />
                      ))}
                    </div>
                  )}

                  {tp.homeProgram && tp.homeProgram.length > 0 && (
                    <div className="bg-blue-500/5 rounded-lg p-2 border border-blue-500/10">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Home className="h-2.5 w-2.5 text-blue-400" />Home Program
                      </p>
                      <div className="space-y-1">
                        {tp.homeProgram.map((hp, i) => {
                          const hpVizId = `tx-hp-${i}`;
                          const hpActive = activeVisualizationId === hpVizId;
                          const hpText = `${hp.exercise} ${hp.dosage} ${hp.instructions}`;
                          return (
                          <div
                            key={i}
                            className={`rounded p-1.5 transition-colors ${onVisualizationRequest ? 'cursor-pointer' : ''} ${hpActive ? 'bg-emerald-900/20 ring-1 ring-emerald-500/15' : 'bg-black/20 hover:bg-black/30'}`}
                            onClick={() => handleVisualizationClick(hpVizId, 'treatment', hp.exercise, hpText)}
                          >
                            <div className="flex items-start justify-between">
                              <p className="text-[10px] font-medium text-blue-300">{hp.exercise}</p>
                              {onVisualizationRequest && (
                                <span className={`p-0.5 shrink-0 ${hpActive ? 'text-emerald-400' : 'text-gray-600'}`}>
                                  {hpActive ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-gray-400">{hp.dosage}</p>
                            <p className="text-[9px] text-gray-500 italic">{hp.instructions}</p>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {tp.prognosis && (
                    <div className="bg-teal-500/5 rounded-lg p-2 border border-teal-500/10">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Prognosis</p>
                      <p className="text-[10px] text-gray-300">{tp.prognosis}</p>
                    </div>
                  )}

                  {tp.contraindications && tp.contraindications.length > 0 && (
                    <div className="bg-red-500/5 rounded-lg p-2 border border-red-500/10">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5 text-red-400" />Contraindications
                      </p>
                      <div className="space-y-0.5">
                        {tp.contraindications.map((c, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <span className="text-red-500 text-[8px] mt-0.5">!</span>
                            <span className="text-[9px] text-red-300/80">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {d.evidenceReferences && d.evidenceReferences.length > 0 && (
                    <div className="bg-violet-500/5 rounded-lg p-2 border border-violet-500/10">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ScrollText className="h-2.5 w-2.5 text-violet-400" />Evidence Base ({d.evidenceReferences.length} papers from PubMed)
                      </p>
                      <EvidenceCitationInline
                        papers={d.evidenceReferences.map(ref => ({
                          title: ref.title,
                          authors: ref.authors,
                          journal: ref.journal,
                          year: ref.year,
                          pmid: ref.pmid,
                          doi: ref.doi,
                          abstract: ref.abstract,
                          studyType: ref.studyType,
                          evidenceGrade: ref.evidenceGrade,
                          pubmedUrl: ref.pubmedUrl,
                        }))}
                        compact={false}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {d.assessmentPriorities.length > 0 && (
            <div>
              <SectionHeader
                icon={TrendingUp}
                title="Assessment Priorities"
                count={d.assessmentPriorities.length}
                color="text-cyan-400"
                isOpen={expandedSections.priorities}
                onToggle={() => toggleSection("priorities")}
              />
              {expandedSections.priorities && (
                <div className="space-y-0.5 mt-1 ml-1">
                  {d.assessmentPriorities.map((priority, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 px-2 py-1">
                      <span className="text-[9px] font-bold text-cyan-500/60 mt-0.5">
                        {idx + 1}.
                      </span>
                      <span className="text-[10px] text-gray-300">{priority}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {d.clinicalSummary && (
            <div className="mt-2 mx-1 p-2 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-semibold text-cyan-300">Clinical Summary</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">{d.clinicalSummary}</p>
            </div>
          )}

          {hasContent && (
            <div className="mt-2">
              <SectionHeader
                icon={ScrollText}
                title="Clinical Notes"
                count={clinicalNotes ? 4 : 0}
                color="text-indigo-400"
                isOpen={expandedSections.clinicalNotes}
                onToggle={() => toggleSection("clinicalNotes")}
              />
              {expandedSections.clinicalNotes && (
                <div className="space-y-2 mt-1 ml-1">
                  {!clinicalNotes && (
                    <div className="bg-indigo-500/5 rounded-lg p-3 border border-indigo-500/10 text-center">
                      <ScrollText className="h-5 w-5 text-indigo-400/50 mx-auto mb-2" />
                      <p className="text-[10px] text-gray-400 mb-2">
                        Generate structured SOAP clinical notes from all the AI reasoning data above
                      </p>
                      <button
                        onClick={generateClinicalNotes}
                        disabled={isGeneratingNotes || !hasContent}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-[10px] font-medium text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isGeneratingNotes ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Generating Notes...
                          </>
                        ) : (
                          <>
                            <ScrollText className="h-3 w-3" />
                            Generate Clinical Notes
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {clinicalNotes && (
                    <>
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[8px] text-gray-600">
                          Generated {new Date(clinicalNotes.generatedAt).toLocaleTimeString()}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={copyAllNotes}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded text-[9px] text-indigo-300 transition-colors"
                          >
                            {copiedSection === 'all' ? <ClipboardCheck className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                            {copiedSection === 'all' ? 'Copied!' : 'Copy All'}
                          </button>
                          <button
                            onClick={generateClinicalNotes}
                            disabled={isGeneratingNotes}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700/50 hover:bg-gray-700 rounded text-[9px] text-gray-400 hover:text-gray-300 disabled:opacity-40 transition-colors"
                          >
                            {isGeneratingNotes ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <ScrollText className="h-2.5 w-2.5" />}
                            Regenerate
                          </button>
                        </div>
                      </div>

                      {([
                        { key: 'subjective', label: 'Subjective', bgClass: 'bg-blue-500/5', borderClass: 'border-blue-500/10', textClass: 'text-blue-300' },
                        { key: 'objective', label: 'Objective', bgClass: 'bg-green-500/5', borderClass: 'border-green-500/10', textClass: 'text-green-300' },
                        { key: 'assessment', label: 'Assessment', bgClass: 'bg-amber-500/5', borderClass: 'border-amber-500/10', textClass: 'text-amber-300' },
                        { key: 'plan', label: 'Plan', bgClass: 'bg-purple-500/5', borderClass: 'border-purple-500/10', textClass: 'text-purple-300' },
                        ...(clinicalNotes.additionalNotes ? [{ key: 'additionalNotes', label: 'Additional Notes', bgClass: 'bg-rose-500/5', borderClass: 'border-rose-500/10', textClass: 'text-rose-300' }] : []),
                      ]).map(({ key, label, bgClass, borderClass, textClass }) => (
                        <div key={key} className={`${bgClass} rounded-lg border ${borderClass} overflow-hidden`}>
                          <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.02]">
                            <span className={`text-[10px] font-semibold ${textClass} uppercase tracking-wider`}>{label}</span>
                            <button
                              onClick={() => copySection(key, (clinicalNotes as any)[key])}
                              className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
                              title={`Copy ${label}`}
                            >
                              {copiedSection === key ? <ClipboardCheck className="h-2.5 w-2.5 text-green-400" /> : <Copy className="h-2.5 w-2.5" />}
                            </button>
                          </div>
                          <div className="px-2.5 py-2">
                            <p className="text-[10px] text-gray-300 leading-relaxed whitespace-pre-wrap">{(clinicalNotes as any)[key]}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
