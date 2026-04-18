import { useState, useCallback, useRef } from 'react';
import { Leaf, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Target, TrendingUp, Loader2, Info, ShieldAlert, Sparkles, Award, Stethoscope, BookOpen, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { InjuryMechanismResult } from '@/lib/injuryMechanismEngine';

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

interface EvidenceForRecommendation {
  articles: EvidenceArticle[];
  overallGrade: 'A' | 'B' | 'C' | 'D';
  confidence?: string;
  source?: 'multi' | 'fallback' | string;
  fallbackReason?: string;
}

type EvidenceMap = Record<string, EvidenceForRecommendation>;

interface AdjunctRecommendation {
  therapyName: string;
  techniqueDetails: string;
  targetStructure: string;
  targetFinding: string;
  clinicalRationale: string;
  expectedBenefit: string;
  contraindications: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D' | string;
  evidenceSummary: string;
  referralGuidance: string;
}

interface AdjunctTherapyGroup {
  groupId: string;
  therapyCategory: string;
  categoryDescription: string;
  priority: number;
  recommendations: AdjunctRecommendation[];
}

interface AdjunctTherapiesPlan {
  therapyGroups: AdjunctTherapyGroup[];
  overallRationale: string;
  safetyConsiderations: string;
  clinicianDisclaimer: string;
}

interface PainMarkerInput {
  label: string;
  severity?: number;
  type?: string;
}

interface AdjunctTherapiesEngineTabProps {
  mechanismAnalysis: InjuryMechanismResult | null;
  painMarkers: PainMarkerInput[];
  diagnosis?: string;
  recoveryPhase?: string;
  irritability?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  'Acupuncture': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  'Tui Na': { bg: 'bg-lime-500/10', border: 'border-lime-500/30', text: 'text-lime-300', badge: 'bg-lime-500/20 text-lime-300' },
  'Bowen Therapy': { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-300', badge: 'bg-teal-500/20 text-teal-300' },
  'Cupping Therapy': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300', badge: 'bg-orange-500/20 text-orange-300' },
  'Moxibustion': { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
  'Myofascial Release Adjuncts': { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', text: 'text-fuchsia-300', badge: 'bg-fuchsia-500/20 text-fuchsia-300' },
  'Other Adjuncts': { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-300', badge: 'bg-slate-500/20 text-slate-300' },
};

const DEFAULT_COLORS = { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' };

const EVIDENCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Strong' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Moderate' },
  C: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Limited' },
  D: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Anecdotal' },
};

const STUDY_TYPE_BADGE: Record<string, string> = {
  'Meta-Analysis': 'bg-purple-500/20 text-purple-300',
  'Systematic Review': 'bg-purple-500/20 text-purple-300',
  'RCT': 'bg-emerald-500/20 text-emerald-300',
  'Clinical Guideline': 'bg-amber-500/20 text-amber-300',
  'Cohort': 'bg-sky-500/20 text-sky-300',
  'Case Study': 'bg-gray-600/30 text-gray-300',
};

function recommendationKey(groupId: string, index: number): string {
  return `${groupId}::${index}`;
}

function RecommendationEvidenceSection({ evidence, loading }: { evidence?: EvidenceForRecommendation; loading: boolean }) {
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
        {evidence?.fallbackReason || 'No supporting evidence found for this therapy.'}
      </div>
    );
  }

  const grade = EVIDENCE_STYLES[evidence.overallGrade] || EVIDENCE_STYLES.D;
  return (
    <div className="mt-1.5 border-t border-gray-700/40 pt-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <BookOpen className="h-2.5 w-2.5 text-emerald-400" />
        <span className="text-[9px] font-medium text-gray-300">Live Evidence ({evidence.articles.length})</span>
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
          const aGrade = EVIDENCE_STYLES[art.evidenceGrade] || EVIDENCE_STYLES.D;
          const studyBadge = STUDY_TYPE_BADGE[art.studyType] || 'bg-gray-600/30 text-gray-300';
          const url = art.pubmedUrl || (art.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/` : (art.doi ? `https://doi.org/${art.doi}` : ''));
          const mo = art.matchedOn;
          const matchedParts: string[] = [];
          if (mo?.modality?.length) matchedParts.push(`therapy: ${mo.modality.join(', ')}`);
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
                <div className="mt-1 text-[9px] text-gray-300 leading-snug border-l-2 border-emerald-500/40 pl-1.5 italic">
                  &ldquo;{art.conclusion}&rdquo;
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 hover:text-emerald-300"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    {art.pmid ? `PMID ${art.pmid}` : (art.doi ? 'DOI' : 'Open')}
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
                        <span className="text-emerald-300/80">{val}</span>
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

function RecommendationCard({ rec, index, evidence, evidenceLoading }: { rec: AdjunctRecommendation; index: number; evidence?: EvidenceForRecommendation; evidenceLoading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const liveGrade = evidence?.overallGrade;
  const displayGrade = liveGrade || rec.evidenceLevel;
  const evGrade = EVIDENCE_STYLES[displayGrade] || EVIDENCE_STYLES.C;
  const hasContra = rec.contraindications && !['none', 'none identified', ''].includes(rec.contraindications.trim().toLowerCase());

  return (
    <div className="border border-gray-600/30 rounded bg-gray-800/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 p-2 text-left hover:bg-gray-700/20 transition-colors"
      >
        <span className="text-[10px] font-mono text-gray-500 mt-0.5 min-w-[16px]">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="text-[11px] font-medium text-gray-200">{rec.therapyName}</div>
            <span
              className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${evGrade.bg} ${evGrade.text} inline-flex items-center gap-0.5`}
              title={liveGrade
                ? `Live evidence grade · ${evidence?.articles.length ?? 0} supporting article${(evidence?.articles.length ?? 0) === 1 ? '' : 's'}`
                : `Model-rated evidence ${rec.evidenceLevel} · ${evGrade.label}`}
            >
              <Award className="h-2 w-2" />
              {displayGrade}
            </span>
            {evidenceLoading && !evidence && (
              <span className="text-[8px] text-gray-500 inline-flex items-center gap-0.5">
                <Loader2 className="h-2 w-2 animate-spin" />
                evidence
              </span>
            )}
            {hasContra && (
              <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 inline-flex items-center gap-0.5" title="Has contraindications">
                <ShieldAlert className="h-2 w-2" />
                safety
              </span>
            )}
          </div>
          {rec.targetFinding && (
            <div className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-1">
              <Target className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
              <span className="truncate">{rec.targetFinding}</span>
            </div>
          )}
          <div className="text-[9px] text-gray-400 mt-0.5 truncate">{rec.techniqueDetails}</div>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0 mt-1" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-gray-700/30 pt-1.5">
          <div>
            <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider">Technique & Dosage</div>
            <div className="text-[10px] text-gray-300">{rec.techniqueDetails}</div>
          </div>
          {rec.targetStructure && (
            <div>
              <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Target Structure / Region</div>
              <div className="text-[10px] text-gray-300">{rec.targetStructure}</div>
            </div>
          )}
          <div>
            <div className="text-[9px] font-medium text-cyan-400/80 uppercase tracking-wider">Clinical Rationale</div>
            <div className="text-[10px] text-gray-300">{rec.clinicalRationale}</div>
          </div>
          <div>
            <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" />
              Expected Benefit
            </div>
            <div className="text-[10px] text-gray-300">{rec.expectedBenefit}</div>
          </div>
          {rec.evidenceSummary && (
            <div className="border border-blue-500/20 rounded bg-blue-500/5 p-1.5">
              <div className="text-[9px] font-medium text-blue-400/80 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                <Award className="h-2.5 w-2.5" />
                Model Evidence Summary ({rec.evidenceLevel} · {(EVIDENCE_STYLES[rec.evidenceLevel] || EVIDENCE_STYLES.C).label})
              </div>
              <div className="text-[10px] text-gray-300 leading-relaxed">{rec.evidenceSummary}</div>
            </div>
          )}
          {hasContra && (
            <div className="border border-red-500/30 rounded bg-red-500/5 p-1.5">
              <div className="text-[9px] font-medium text-red-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                Contraindications & Safety
              </div>
              <div className="text-[10px] text-red-200/90">{rec.contraindications}</div>
            </div>
          )}
          {rec.referralGuidance && (
            <div>
              <div className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider flex items-center gap-1">
                <Stethoscope className="h-2.5 w-2.5" />
                Referral / Scope Guidance
              </div>
              <div className="text-[10px] text-gray-300">{rec.referralGuidance}</div>
            </div>
          )}
          <RecommendationEvidenceSection evidence={evidence} loading={evidenceLoading && !evidence} />
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
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${(EVIDENCE_STYLES[evidence.overallGrade] || EVIDENCE_STYLES.D).bg} ${(EVIDENCE_STYLES[evidence.overallGrade] || EVIDENCE_STYLES.D).text}`}>
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

export default function AdjunctTherapiesEngineTab({ mechanismAnalysis, painMarkers, diagnosis, recoveryPhase, irritability }: AdjunctTherapiesEngineTabProps) {
  const [plan, setPlan] = useState<AdjunctTherapiesPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(false);
  const [evidenceMap, setEvidenceMap] = useState<EvidenceMap>({});
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const evidenceAbortRef = useRef<AbortController | null>(null);

  const fetchEvidence = useCallback(async (currentPlan: AdjunctTherapiesPlan) => {
    if (evidenceAbortRef.current) evidenceAbortRef.current.abort();
    const controller = new AbortController();
    evidenceAbortRef.current = controller;

    const recommendationsPayload: Array<{ key: string; therapyName: string; therapyCategory: string; targetStructure: string; targetFinding: string }> = [];
    currentPlan.therapyGroups.forEach(group => {
      group.recommendations.forEach((rec, idx) => {
        recommendationsPayload.push({
          key: recommendationKey(group.groupId, idx),
          therapyName: rec.therapyName,
          therapyCategory: group.therapyCategory || '',
          targetStructure: rec.targetStructure || '',
          targetFinding: rec.targetFinding || '',
        });
      });
    });

    if (recommendationsPayload.length === 0) return;

    const region = (mechanismAnalysis?.topContributors?.[0] as { region?: string } | undefined)?.region
      || painMarkers[0]?.label
      || '';
    const condition = diagnosis
      || mechanismAnalysis?.overallMechanismSummary?.split(/[.,;]/)[0]?.trim().slice(0, 80)
      || '';

    setEvidenceLoading(true);
    setEvidenceError(null);
    setEvidenceMap({});

    try {
      const result = await apiRequest('/api/adjunct-therapies-engine/evidence', 'POST', {
        recommendations: recommendationsPayload,
        region,
        condition,
      }) as { evidenceByRecommendation: EvidenceMap };
      if (controller.signal.aborted) return;
      setEvidenceMap(result.evidenceByRecommendation || {});
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setEvidenceError(msg);
    } finally {
      if (!controller.signal.aborted) setEvidenceLoading(false);
    }
  }, [mechanismAnalysis, painMarkers, diagnosis]);

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
        diagnosis: diagnosis ?? '',
        recoveryPhase: recoveryPhase ?? '',
        irritability: irritability ?? '',
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

      const result = await apiRequest('/api/adjunct-therapies-engine/generate', 'POST', payload) as AdjunctTherapiesPlan;
      if (controller.signal.aborted) return;
      const sorted = {
        ...result,
        therapyGroups: [...(result.therapyGroups || [])].sort((a, b) => a.priority - b.priority),
      };
      setPlan(sorted);
      setExpandedGroups(new Set(sorted.therapyGroups.map(g => g.groupId)));
      void fetchEvidence(sorted);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [mechanismAnalysis, painMarkers, diagnosis, recoveryPhase, irritability, fetchEvidence]);

  const hasData = mechanismAnalysis !== null || (painMarkers && painMarkers.length > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <Leaf className="h-8 w-8 text-gray-600 mb-2" />
        <div className="text-[11px] text-gray-400 mb-1">No clinical data available</div>
        <div className="text-[9px] text-gray-500">Place pain markers and run the mechanism analysis first to generate adjunct natural therapy suggestions.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-6 w-6 text-emerald-400 animate-spin mb-3" />
        <div className="text-[11px] text-gray-300 mb-1">Generating adjunct therapy suggestions...</div>
        <div className="text-[9px] text-gray-500">Matching evidence-informed natural therapies to phase &amp; irritability</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <AlertTriangle className="h-6 w-6 text-red-400 mb-2" />
        <div className="text-[11px] text-red-300 mb-2">Failed to generate adjunct therapies plan</div>
        <div className="text-[9px] text-gray-400 mb-3">{error}</div>
        <button onClick={generatePlan} className="px-3 py-1.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <Leaf className="h-8 w-8 text-emerald-400/60 mb-3" />
        <div className="text-[11px] text-gray-300 mb-1">Adjunct Natural Therapies</div>
        <div className="text-[9px] text-gray-500 mb-4 text-center max-w-[280px]">
          Generate evidence-informed adjunct therapy suggestions (Acupuncture, Tui Na, Bowen, Cupping, Moxibustion, Myofascial Release) tailored to this patient's condition, irritability and recovery phase.
        </div>
        <button onClick={generatePlan} className="px-4 py-2 text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Adjunct Therapies
        </button>
        <div className="mt-4 text-[8px] text-gray-500 text-center max-w-[280px] italic border-t border-gray-700/30 pt-2">
          Adjunct suggestions for clinician discussion or referral to a qualified practitioner — not a medical prescription.
        </div>
      </div>
    );
  }

  const totalRecs = plan.therapyGroups.reduce((sum, g) => sum + g.recommendations.length, 0);
  const evidenceCount = Object.values(evidenceMap).reduce((sum, e) => sum + (e?.articles?.length ?? 0), 0);

  return (
    <div className="space-y-2">
      <div className="border border-amber-500/30 bg-amber-500/5 rounded p-2 flex items-start gap-1.5">
        <Info className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[9px] text-amber-200/90 leading-snug">
          {plan.clinicianDisclaimer || 'These are adjunct suggestions for clinician discussion or referral to a qualified practitioner — not a medical prescription.'}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 text-[9px]">
        <span className="text-gray-500 uppercase tracking-wider">Context:</span>
        <span className={`px-1.5 py-0.5 rounded-full border ${diagnosis ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-gray-700/40 text-gray-500 border-gray-600/30'}`}>
          Dx: {diagnosis || 'Not specified'}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full border ${recoveryPhase ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-gray-700/40 text-gray-500 border-gray-600/30'}`}>
          Phase: {recoveryPhase || 'Not specified'}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full border ${irritability ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-gray-700/40 text-gray-500 border-gray-600/30'}`}>
          Irritability: {irritability || 'Not specified'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Leaf className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium text-gray-200">
            {totalRecs} Recommendations · {plan.therapyGroups.length} Categories
          </span>
          {evidenceLoading && (
            <span className="text-[9px] text-gray-500 inline-flex items-center gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              fetching live evidence…
            </span>
          )}
          {!evidenceLoading && evidenceCount > 0 && (
            <span className="text-[9px] text-emerald-400/80 inline-flex items-center gap-1">
              <BookOpen className="h-2.5 w-2.5" />
              {evidenceCount} article{evidenceCount === 1 ? '' : 's'}
            </span>
          )}
          {evidenceError && (
            <span className="text-[9px] text-red-400/80" title={evidenceError}>evidence fetch failed</span>
          )}
        </div>
        <button
          onClick={generatePlan}
          className="px-2 py-1 text-[9px] bg-gray-700/40 text-gray-400 border border-gray-600/30 rounded hover:text-gray-200 hover:bg-gray-700/60 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Regenerate
        </button>
      </div>

      {plan.therapyGroups.map(group => {
        const colors = CATEGORY_COLORS[group.therapyCategory] ?? DEFAULT_COLORS;
        const isExpanded = expandedGroups.has(group.groupId);

        return (
          <div key={group.groupId} className={`border ${colors.border} rounded-lg overflow-hidden`}>
            <button
              onClick={() => toggleGroup(group.groupId)}
              className={`w-full flex items-center gap-2 p-2 text-left ${colors.bg} hover:brightness-110 transition-all`}
            >
              <Leaf className={`h-3.5 w-3.5 ${colors.text} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium ${colors.text}`}>{group.therapyCategory}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                    P{group.priority} · {group.recommendations.length} rec
                  </span>
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 truncate">{group.categoryDescription}</div>
              </div>
              {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0" />}
            </button>
            {isExpanded && (
              <div className="p-2 space-y-1.5">
                {group.recommendations.map((rec, i) => {
                  const key = recommendationKey(group.groupId, i);
                  return (
                    <RecommendationCard
                      key={`${group.groupId}-${i}`}
                      rec={rec}
                      index={i}
                      evidence={evidenceMap[key]}
                      evidenceLoading={evidenceLoading}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {(plan.overallRationale || plan.safetyConsiderations) && (
        <div className="border border-gray-600/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-full flex items-center gap-2 p-2 text-left bg-gray-800/40 hover:bg-gray-700/30 transition-colors"
          >
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="text-[10px] font-medium text-gray-300 flex-1">Clinical Reasoning &amp; Safety Considerations</span>
            {showNotes ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
          </button>
          {showNotes && (
            <div className="p-2 space-y-2 border-t border-gray-700/30">
              {plan.overallRationale && (
                <div>
                  <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mb-1">Overall Rationale</div>
                  <div className="text-[10px] text-gray-300 leading-relaxed">{plan.overallRationale}</div>
                </div>
              )}
              {plan.safetyConsiderations && (
                <div>
                  <div className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider mb-1">Safety Considerations</div>
                  <div className="text-[10px] text-amber-200/70 leading-relaxed">{plan.safetyConsiderations}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
