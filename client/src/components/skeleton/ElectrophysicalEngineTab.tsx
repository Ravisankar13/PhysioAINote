import { useState, useCallback, useRef } from 'react';
import { Zap, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Target, TrendingUp, Shield, Loader2, Activity, Waves, ExternalLink, HelpCircle, BookOpen, Award } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
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
  matchedOn?: string[];
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
                {art.matchedOn && art.matchedOn.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[8px] text-gray-500">matched on:</span>
                    {art.matchedOn.slice(0, 4).map((m, j) => (
                      <span key={j} className="text-[8px] px-1 py-0.5 rounded bg-teal-500/10 text-teal-300/80 border border-teal-500/20">{m}</span>
                    ))}
                  </div>
                )}
              </div>
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
}

interface ModalityGroup {
  groupId: string;
  goalTitle: string;
  goalDescription: string;
  priority: number;
  modalities: ModalityItem[];
}

interface ElectrophysicalPlan {
  modalityGroups: ModalityGroup[];
  clinicalNotes: string;
  irritabilityConsiderations: string;
}

interface PainMarkerInput {
  label: string;
  severity?: number;
  type?: string;
}

interface ElectrophysicalEngineTabProps {
  mechanismAnalysis: InjuryMechanismResult | null;
  slingAnalysis: SlingAnalysisResult | null;
  painMarkers: PainMarkerInput[];
}

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

function ModalityCard({ modality, index, evidence, evidenceLoading }: { modality: ModalityItem; index: number; evidence?: EvidenceForModality; evidenceLoading: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-600/30 rounded bg-gray-800/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 p-2 text-left hover:bg-gray-700/20 transition-colors"
      >
        <span className="text-[10px] font-mono text-gray-500 mt-0.5 min-w-[16px]">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-gray-200">{modality.modality}</div>
          {modality.targetFinding && (
            <div className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-1">
              <Target className="h-2.5 w-2.5 text-teal-400 shrink-0" />
              <span className="truncate">{modality.targetFinding}</span>
            </div>
          )}
          <div className="flex gap-2 mt-1 text-[9px] flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300 truncate max-w-[180px]">{modality.parameters || '?'}</span>
            {modality.patientPosition && (
              <span className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-400">Pos: {modality.patientPosition}</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0 mt-1" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-gray-700/30 pt-1.5">
          <div>
            <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Target Structure</div>
            <div className="text-[10px] text-gray-300">{modality.targetStructure}</div>
          </div>
          <div>
            <div className="text-[9px] font-medium text-teal-400/80 uppercase tracking-wider">Parameters</div>
            <div className="text-[10px] text-gray-300">{modality.parameters}</div>
          </div>
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

export default function ElectrophysicalEngineTab({ mechanismAnalysis, slingAnalysis, painMarkers }: ElectrophysicalEngineTabProps) {
  const [plan, setPlan] = useState<ElectrophysicalPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(false);
  const [evidenceMap, setEvidenceMap] = useState<EvidenceMap>({});
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const evidenceAbortRef = useRef<AbortController | null>(null);

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
    const condition = mechanismAnalysis?.overallMechanismSummary?.split(/[.,;]/)[0]?.trim().slice(0, 80) || '';

    setEvidenceLoading(true);
    setEvidenceError(null);
    setEvidenceMap({});

    try {
      const result = await apiRequest('/api/electrophysical-engine/evidence', 'POST', {
        modalities: modalitiesPayload,
        region,
        condition,
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
  }, [mechanismAnalysis, painMarkers]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const generatePlan = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

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
  }, [mechanismAnalysis, slingAnalysis, painMarkers]);

  const hasData = mechanismAnalysis !== null || (painMarkers && painMarkers.length > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <Zap className="h-8 w-8 text-gray-600 mb-2" />
        <div className="text-[11px] text-gray-400 mb-1">No clinical data available</div>
        <div className="text-[9px] text-gray-500">Place pain markers and run the mechanism analysis first to generate an AI electrophysical agents prescription.</div>
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
        <button onClick={generatePlan} className="px-3 py-1.5 text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded hover:bg-teal-500/30 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <Zap className="h-8 w-8 text-teal-400/60 mb-3" />
        <div className="text-[11px] text-gray-300 mb-1">AI Electrophysical Agents Prescription</div>
        <div className="text-[9px] text-gray-500 mb-4 text-center max-w-[250px]">
          Generate a targeted electrophysical modality plan based on mechanism analysis, tissue irritability, and clinical findings.
        </div>
        <button onClick={generatePlan} className="px-4 py-2 text-[11px] font-medium bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-lg hover:bg-teal-500/30 transition-colors flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" />
          Generate Electrophysical Plan
        </button>
      </div>
    );
  }

  const totalModalities = plan.modalityGroups.reduce((sum, g) => sum + g.modalities.length, 0);

  return (
    <div className="space-y-2">
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
            onClick={generatePlan}
            className="px-2 py-1 text-[9px] bg-gray-700/40 text-gray-400 border border-gray-600/30 rounded hover:text-gray-200 hover:bg-gray-700/60 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            Regenerate
          </button>
        </div>
      </div>
      {evidenceError && (
        <div className="text-[9px] text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
          Evidence fetch failed: {evidenceError}
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
