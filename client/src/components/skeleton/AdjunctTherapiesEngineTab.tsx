import { useState, useCallback, useRef } from 'react';
import { Leaf, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Target, TrendingUp, Loader2, Info, ShieldAlert, Sparkles, Award, Stethoscope } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { InjuryMechanismResult } from '@/lib/injuryMechanismEngine';

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

function RecommendationCard({ rec, index }: { rec: AdjunctRecommendation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const evGrade = EVIDENCE_STYLES[rec.evidenceLevel] || EVIDENCE_STYLES.C;
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
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${evGrade.bg} ${evGrade.text} inline-flex items-center gap-0.5`} title={`Evidence ${rec.evidenceLevel} · ${evGrade.label}`}>
              <Award className="h-2 w-2" />
              {rec.evidenceLevel}
            </span>
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
                Evidence ({rec.evidenceLevel} · {evGrade.label})
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
  const abortRef = useRef<AbortController | null>(null);

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
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [mechanismAnalysis, painMarkers, diagnosis, recoveryPhase, irritability]);

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
        <div className="flex items-center gap-1.5">
          <Leaf className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium text-gray-200">
            {totalRecs} Recommendations · {plan.therapyGroups.length} Categories
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
                {group.recommendations.map((rec, i) => (
                  <RecommendationCard key={`${group.groupId}-${i}`} rec={rec} index={i} />
                ))}
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
