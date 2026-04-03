import { useState } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
  Target,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Pill,
  Dumbbell,
  Hand,
  BookOpen,
  Activity,
  Sparkles,
  Eye,
} from "lucide-react";

export interface RankedIntervention {
  id: string;
  name: string;
  category: string;
  tier: 'primary' | 'adjunct' | 'avoid_defer';
  intent: 'symptom_relief' | 'root_cause' | 'both';
  score: number;
  description: string;
  dosage: string;
  rationale: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'Expert';
  targetRegions: string[];
  riskFlags: string[];
  explainability: string[];
  stageAppropriate: boolean;
  irritabilityAppropriate: boolean;
}

export interface ReviewSchedule {
  reassessmentDays: number;
  reassessmentLabel: string;
  irritabilityBasis: string;
  stageBasis: string;
  milestones: string[];
  criteria: string[];
}

export interface TreatmentDecisionResult {
  primary: RankedIntervention[];
  adjunct: RankedIntervention[];
  avoidDefer: RankedIntervention[];
  reviewSchedule: ReviewSchedule;
  topHypothesis: string;
  problemClass: string;
  mechanism: string;
  stage: string;
  irritability: string;
  decisionSummary: string;
  timestamp: string;
}

interface DecisionTabProps {
  data: TreatmentDecisionResult | null;
  isLoading: boolean;
  onTargetRegionClick?: (regions: string[]) => void;
}

const CATEGORY_ICON: Record<string, typeof Hand> = {
  manual_therapy: Hand,
  exercise: Dumbbell,
  modality: Zap,
  education: BookOpen,
  load_management: Activity,
  neural: Sparkles,
  pharmacological_referral: Pill,
};

const INTENT_CONFIG = {
  symptom_relief: { label: 'Symptom Relief', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  root_cause: { label: 'Root Cause', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  both: { label: 'Both', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
};

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-400',
  B: 'bg-blue-500/20 text-blue-400',
  C: 'bg-amber-500/20 text-amber-400',
  Expert: 'bg-gray-500/20 text-gray-400',
};

function InterventionCard({ intervention, onTargetClick }: { intervention: RankedIntervention; onTargetClick?: (regions: string[]) => void }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICON[intervention.category] || Zap;
  const intentCfg = INTENT_CONFIG[intervention.intent];

  const tierColors = {
    primary: 'border-emerald-500/30 bg-emerald-500/5',
    adjunct: 'border-blue-500/30 bg-blue-500/5',
    avoid_defer: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <div className={`rounded-lg border ${tierColors[intervention.tier]} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/5 transition-colors"
      >
        <div className={`flex items-center justify-center h-6 w-6 rounded-md ${intervention.tier === 'avoid_defer' ? 'bg-red-500/20' : intervention.tier === 'primary' ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
          <Icon className={`h-3.5 w-3.5 ${intervention.tier === 'avoid_defer' ? 'text-red-400' : intervention.tier === 'primary' ? 'text-emerald-400' : 'text-blue-400'}`} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[10px] font-semibold text-gray-200 truncate">{intervention.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${intentCfg.color}`}>
              {intentCfg.label}
            </span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${GRADE_COLOR[intervention.evidenceGrade]}`}>
              Grade {intervention.evidenceGrade}
            </span>
          </div>
        </div>
        {intervention.tier === 'avoid_defer' ? (
          <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
        ) : (
          expanded ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-white/5 pt-2">
          <p className="text-[9px] text-gray-400 leading-relaxed">{intervention.description}</p>

          <div className="flex items-start gap-1.5">
            <Clock className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[8px] text-gray-500 uppercase tracking-wider">Dosage</p>
              <p className="text-[9px] text-gray-300">{intervention.dosage}</p>
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <Target className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[8px] text-gray-500 uppercase tracking-wider">Rationale</p>
              <p className="text-[9px] text-gray-300 leading-relaxed">{intervention.rationale}</p>
            </div>
          </div>

          {intervention.targetRegions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {intervention.targetRegions.map(r => (
                <button
                  key={r}
                  onClick={(e) => { e.stopPropagation(); onTargetClick?.([r]); }}
                  className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {intervention.riskFlags.length > 0 && (
            <div className="space-y-1 mt-1">
              {intervention.riskFlags.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[9px] text-amber-400">{f}</p>
                </div>
              ))}
            </div>
          )}

          {intervention.explainability.length > 0 && (
            <div className="mt-1 p-1.5 rounded bg-white/3 space-y-0.5">
              <p className="text-[8px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Eye className="h-2.5 w-2.5" /> Why this intervention
              </p>
              {intervention.explainability.map((e, i) => (
                <p key={i} className="text-[9px] text-gray-400 flex items-start gap-1">
                  <ArrowRight className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-emerald-500" />
                  {e}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DecisionTab({ data, isLoading, onTargetRegionClick }: DecisionTabProps) {
  const [reviewExpanded, setReviewExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mb-3" />
        <p className="text-xs text-gray-400">Running treatment decision pipeline...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
          <Shield className="h-6 w-6 text-emerald-500/50" />
        </div>
        <p className="text-xs text-gray-400 mb-1">Treatment Decision Engine</p>
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Run the Structured analysis first — the decision engine builds on those results
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Decision Summary</span>
        </div>
        <p className="text-[9px] text-gray-300 leading-relaxed">{data.decisionSummary}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
            {data.stage}
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
            {data.irritability} irritability
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
            {data.mechanism}
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
            {data.problemClass}
          </span>
        </div>
      </div>

      {data.primary.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
              Primary Interventions
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              {data.primary.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {data.primary.map(iv => (
              <InterventionCard key={iv.id} intervention={iv} onTargetClick={onTargetRegionClick} />
            ))}
          </div>
        </div>
      )}

      {data.adjunct.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-1.5">
            <Activity className="h-3 w-3 text-blue-400" />
            <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
              Adjunct Interventions
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
              {data.adjunct.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {data.adjunct.map(iv => (
              <InterventionCard key={iv.id} intervention={iv} onTargetClick={onTargetRegionClick} />
            ))}
          </div>
        </div>
      )}

      {data.avoidDefer.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-1.5">
            <XCircle className="h-3 w-3 text-red-400" />
            <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
              Avoid / Defer
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
              {data.avoidDefer.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {data.avoidDefer.map(iv => (
              <InterventionCard key={iv.id} intervention={iv} onTargetClick={onTargetRegionClick} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-700/50 overflow-hidden">
        <button
          onClick={() => setReviewExpanded(!reviewExpanded)}
          className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">Review Schedule</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
              {data.reviewSchedule.reassessmentLabel}
            </span>
          </div>
          {reviewExpanded ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
        </button>
        {reviewExpanded && (
          <div className="px-2.5 pb-2.5 space-y-2 border-t border-white/5 pt-2">
            <div>
              <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Reassess In</p>
              <p className="text-[10px] text-violet-400 font-semibold">{data.reviewSchedule.reassessmentLabel}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">
                Based on {data.reviewSchedule.irritabilityBasis} irritability + {data.reviewSchedule.stageBasis} stage
              </p>
            </div>
            {data.reviewSchedule.milestones.length > 0 && (
              <div>
                <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Milestones</p>
                {data.reviewSchedule.milestones.map((m, i) => (
                  <p key={i} className="text-[9px] text-gray-300 flex items-start gap-1">
                    <Target className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-violet-400" />
                    {m}
                  </p>
                ))}
              </div>
            )}
            {data.reviewSchedule.criteria.length > 0 && (
              <div>
                <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">Progression Criteria</p>
                {data.reviewSchedule.criteria.map((c, i) => (
                  <p key={i} className="text-[9px] text-gray-300 flex items-start gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-emerald-400" />
                    {c}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
