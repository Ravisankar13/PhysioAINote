import { useState, useCallback, useRef } from 'react';
import { GraduationCap, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Loader2, BookOpen, Heart, Activity, Brain, Shield, Clock, HelpCircle, Lightbulb, Dumbbell, Users, Briefcase, Apple, Flame } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { InjuryMechanismResult } from '@/lib/injuryMechanismEngine';
import type { SlingAnalysisResult } from '@/lib/slingEngine';

interface EducationCategory {
  categoryId: string;
  categoryTitle: string;
  content: string;
  keyPoints: string[];
  analogy?: string;
}

interface PatientEducationPlan {
  educationCategories: EducationCategory[];
  overallSummary: string;
  communicationTips: string;
}

interface PainMarkerInput {
  label: string;
  severity?: number;
  type?: string;
}

interface PatientEducationEngineTabProps {
  mechanismAnalysis: InjuryMechanismResult | null;
  slingAnalysis: SlingAnalysisResult | null;
  painMarkers: PainMarkerInput[];
}

const CATEGORY_CONFIG: Record<string, { icon: typeof GraduationCap; color: { bg: string; border: string; text: string; badge: string } }> = {
  'Condition Explanation': { icon: HelpCircle, color: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' } },
  'Activity Modification': { icon: Activity, color: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300' } },
  'Load Management': { icon: Shield, color: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' } },
  'Self-Management Strategies': { icon: Heart, color: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-300', badge: 'bg-pink-500/20 text-pink-300' } },
  'Red Flags & When to Seek Help': { icon: AlertTriangle, color: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300', badge: 'bg-red-500/20 text-red-300' } },
  'Recovery Timeline & Expectations': { icon: Clock, color: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', badge: 'bg-cyan-500/20 text-cyan-300' } },
  'Myths & Misconceptions': { icon: Lightbulb, color: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-300', badge: 'bg-yellow-500/20 text-yellow-300' } },
  'Pain Neuroscience Education (PNE)': { icon: Brain, color: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-300', badge: 'bg-violet-500/20 text-violet-300' } },
  'Ergonomic & Postural Guidance': { icon: Briefcase, color: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300', badge: 'bg-indigo-500/20 text-indigo-300' } },
  'Flare-Up Management Plan': { icon: Flame, color: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300', badge: 'bg-orange-500/20 text-orange-300' } },
  'Movement & Exercise Rationale': { icon: Dumbbell, color: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-300', badge: 'bg-teal-500/20 text-teal-300' } },
  'Psychosocial Factors & Coping': { icon: Users, color: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300' } },
  'Return-to-Sport / Return-to-Work Criteria': { icon: Briefcase, color: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-300', badge: 'bg-sky-500/20 text-sky-300' } },
  'Nutrition & Lifestyle Factors': { icon: Apple, color: { bg: 'bg-lime-500/10', border: 'border-lime-500/30', text: 'text-lime-300', badge: 'bg-lime-500/20 text-lime-300' } },
};

const DEFAULT_CONFIG = { icon: BookOpen, color: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' } };

function findCategoryConfig(title: string) {
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    if (title.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(title.toLowerCase())) {
      return config;
    }
  }
  if (title.toLowerCase().includes('condition')) return CATEGORY_CONFIG['Condition Explanation'];
  if (title.toLowerCase().includes('activity')) return CATEGORY_CONFIG['Activity Modification'];
  if (title.toLowerCase().includes('load')) return CATEGORY_CONFIG['Load Management'];
  if (title.toLowerCase().includes('self-management') || title.toLowerCase().includes('self management')) return CATEGORY_CONFIG['Self-Management Strategies'];
  if (title.toLowerCase().includes('red flag')) return CATEGORY_CONFIG['Red Flags & When to Seek Help'];
  if (title.toLowerCase().includes('recovery') || title.toLowerCase().includes('timeline')) return CATEGORY_CONFIG['Recovery Timeline & Expectations'];
  if (title.toLowerCase().includes('myth')) return CATEGORY_CONFIG['Myths & Misconceptions'];
  if (title.toLowerCase().includes('pain neuroscience') || title.toLowerCase().includes('pne')) return CATEGORY_CONFIG['Pain Neuroscience Education (PNE)'];
  if (title.toLowerCase().includes('ergonomic') || title.toLowerCase().includes('postural guidance')) return CATEGORY_CONFIG['Ergonomic & Postural Guidance'];
  if (title.toLowerCase().includes('flare')) return CATEGORY_CONFIG['Flare-Up Management Plan'];
  if (title.toLowerCase().includes('exercise rationale') || title.toLowerCase().includes('movement')) return CATEGORY_CONFIG['Movement & Exercise Rationale'];
  if (title.toLowerCase().includes('psychosocial') || title.toLowerCase().includes('coping')) return CATEGORY_CONFIG['Psychosocial Factors & Coping'];
  if (title.toLowerCase().includes('return')) return CATEGORY_CONFIG['Return-to-Sport / Return-to-Work Criteria'];
  if (title.toLowerCase().includes('nutrition') || title.toLowerCase().includes('lifestyle')) return CATEGORY_CONFIG['Nutrition & Lifestyle Factors'];
  return DEFAULT_CONFIG;
}

function EducationCard({ category }: { category: EducationCategory }) {
  const [expanded, setExpanded] = useState(false);
  const config = findCategoryConfig(category.categoryTitle);
  const Icon = config.icon;
  const colors = config.color;

  return (
    <div className={`border ${colors.border} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 p-2 text-left ${colors.bg} hover:brightness-110 transition-all`}
      >
        <Icon className={`h-3.5 w-3.5 ${colors.text} shrink-0`} />
        <span className={`text-[11px] font-medium ${colors.text} flex-1`}>{category.categoryTitle}</span>
        <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${colors.badge}`}>
          {category.keyPoints.length} tips
        </span>
        {expanded ? <ChevronUp className="h-3 w-3 text-gray-500 shrink-0" /> : <ChevronDown className="h-3 w-3 text-gray-500 shrink-0" />}
      </button>
      {expanded && (
        <div className="p-2.5 space-y-2 border-t border-gray-700/30">
          <div className="text-[10px] text-gray-300 leading-relaxed whitespace-pre-line">{category.content}</div>

          {category.keyPoints.length > 0 && (
            <div className="border border-emerald-500/20 rounded bg-emerald-500/5 p-2">
              <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                <BookOpen className="h-2.5 w-2.5" />
                Key Takeaways
              </div>
              <ul className="space-y-0.5">
                {category.keyPoints.map((point, i) => (
                  <li key={i} className="text-[9px] text-gray-300 flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {category.analogy && (
            <div className="border border-amber-500/20 rounded bg-amber-500/5 p-2">
              <div className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Lightbulb className="h-2.5 w-2.5" />
                Analogy
              </div>
              <div className="text-[9px] text-gray-300 italic leading-relaxed">{category.analogy}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PatientEducationEngineTab({ mechanismAnalysis, slingAnalysis, painMarkers }: PatientEducationEngineTabProps) {
  const [plan, setPlan] = useState<PatientEducationPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

      const result = await apiRequest('/api/patient-education-engine/generate', 'POST', payload) as PatientEducationPlan;
      if (controller.signal.aborted) return;
      setPlan(result);
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
        <GraduationCap className="h-8 w-8 text-gray-600 mb-2" />
        <div className="text-[11px] text-gray-400 mb-1">No clinical data available</div>
        <div className="text-[9px] text-gray-500">Place pain markers and run the mechanism analysis first to generate patient education content.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-6 w-6 text-emerald-400 animate-spin mb-3" />
        <div className="text-[11px] text-gray-300 mb-1">Generating patient education...</div>
        <div className="text-[9px] text-gray-500">AI is creating tailored education content based on clinical findings</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <AlertTriangle className="h-6 w-6 text-red-400 mb-2" />
        <div className="text-[11px] text-red-300 mb-2">Failed to generate patient education</div>
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
        <GraduationCap className="h-8 w-8 text-emerald-400/60 mb-3" />
        <div className="text-[11px] text-gray-300 mb-1">AI Patient Education Engine</div>
        <div className="text-[9px] text-gray-500 mb-4 text-center max-w-[250px]">
          Generate comprehensive, patient-friendly education content tailored to the clinical findings — condition explanation, activity modification, load management, and more.
        </div>
        <button onClick={generatePlan} className="px-4 py-2 text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-2">
          <GraduationCap className="h-3.5 w-3.5" />
          Generate Patient Education
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium text-gray-200">
            {plan.educationCategories.length} Education Topics
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

      {plan.overallSummary && (
        <div className="border border-emerald-500/20 rounded-lg bg-emerald-500/5 p-2">
          <div className="text-[9px] font-medium text-emerald-400/80 uppercase tracking-wider mb-1">Opening Statement</div>
          <div className="text-[10px] text-gray-300 leading-relaxed italic">{plan.overallSummary}</div>
        </div>
      )}

      {plan.educationCategories.map(cat => (
        <EducationCard key={cat.categoryId} category={cat} />
      ))}

      {plan.communicationTips && (
        <div className="border border-gray-600/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowTips(!showTips)}
            className="w-full flex items-center gap-2 p-2 text-left bg-gray-800/40 hover:bg-gray-700/30 transition-colors"
          >
            <Users className="h-3 w-3 text-purple-400 shrink-0" />
            <span className="text-[10px] font-medium text-gray-300 flex-1">Therapist Communication Tips</span>
            {showTips ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
          </button>
          {showTips && (
            <div className="p-2 border-t border-gray-700/30">
              <div className="text-[10px] text-gray-300 leading-relaxed">{plan.communicationTips}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
