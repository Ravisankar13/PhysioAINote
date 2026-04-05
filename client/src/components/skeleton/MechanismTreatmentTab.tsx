import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Target,
  Stethoscope,
  Dumbbell,
  Zap,
  AlertCircle,
  ArrowRight,
  Shield,
  Link2,
  Activity,
} from "lucide-react";
import type { InjuryMechanismResult } from "@/lib/injuryMechanismEngine";
import {
  generateMechanismTreatments,
  type MechTreatmentResult,
  type MechTreatmentTarget,
  type MechTreatmentTechnique,
  type MechTargetCategory,
} from "@/lib/mechanismTreatmentEngine";

interface MechanismTreatmentTabProps {
  analysis: InjuryMechanismResult | null;
  onNavigateToDecisionTab?: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  moderate: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  severe: 'text-red-400 border-red-500/30 bg-red-500/10',
};

const CATEGORY_COLORS: Record<string, string> = {
  root_cause: 'border-l-red-500',
  intermediate: 'border-l-amber-500',
  symptom: 'border-l-blue-500',
  compensation: 'border-l-purple-500',
  overload: 'border-l-orange-500',
  chain: 'border-l-cyan-500',
};

const CATEGORY_LABELS: Record<string, string> = {
  root_cause: 'Root Cause',
  intermediate: 'Mechanism',
  symptom: 'Symptom',
  compensation: 'Compensation',
  overload: 'Overloaded Joint',
  chain: 'Chain Dysfunction',
};

const CATEGORY_ICONS: Record<string, typeof Target> = {
  root_cause: Target,
  intermediate: Link2,
  symptom: AlertCircle,
  compensation: Activity,
  overload: Zap,
  chain: Link2,
};

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-400 border-green-500/30 bg-green-500/10',
  B: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  C: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  Expert: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
};

const TYPE_ICONS: Record<string, typeof Stethoscope> = {
  manual: Stethoscope,
  exercise: Dumbbell,
  modality: Zap,
};

function TechniqueCard({ technique }: { technique: MechTreatmentTechnique }) {
  const Icon = TYPE_ICONS[technique.type] || Dumbbell;

  return (
    <div className="rounded bg-gray-800/50 border border-gray-700/40 p-1.5 space-y-0.5">
      <div className="flex items-start gap-1.5">
        <Icon className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-medium text-gray-200">{technique.name}</span>
            <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${GRADE_COLORS[technique.evidenceGrade]}`}>
              {technique.evidenceGrade}
            </Badge>
          </div>
          <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">{technique.dosage}</div>
          <div className="text-[9px] text-gray-500 italic mt-0.5">{technique.rationale}</div>
        </div>
      </div>
    </div>
  );
}

function TargetCard({ target, defaultOpen }: { target: MechTreatmentTarget; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const CategoryIcon = CATEGORY_ICONS[target.category] || Target;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={`w-full text-left rounded border-l-2 bg-gray-800/30 hover:bg-gray-800/50 transition-colors px-2 py-1.5 ${CATEGORY_COLORS[target.category]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <CategoryIcon className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-[11px] font-medium text-gray-200 truncate">{target.structure}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1 flex-wrap justify-end">
            <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${SEVERITY_COLORS[target.severity]}`}>
              {target.severity}
            </Badge>
            {(target.roles && target.roles.length > 1 ? target.roles : [target.category]).map((role: MechTargetCategory) => (
              <Badge key={role} variant="outline" className="text-[7px] px-1 py-0 h-3.5 text-gray-400 border-gray-600/40">
                {CATEGORY_LABELS[role]}
              </Badge>
            ))}
            {open ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
          </div>
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5 truncate">{target.action}</div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2 py-1.5 space-y-1.5 border-l-2 border-gray-700/30 ml-1">
          <div className="space-y-0.5">
            <div className="text-[10px] text-gray-400">
              <span className="text-gray-500">Finding: </span>{target.finding}
            </div>
            <div className="text-[9px] text-gray-500 italic">{target.mechanism}</div>
          </div>

          <Separator className="bg-gray-700/30" />

          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-gray-300">Recommended Interventions</span>
            {target.techniques.map((tech, i) => (
              <TechniqueCard key={i} technique={tech} />
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function MechanismTreatmentTab({ analysis, onNavigateToDecisionTab }: MechanismTreatmentTabProps) {
  const [copied, setCopied] = useState(false);

  const treatmentResult = useMemo((): MechTreatmentResult | null => {
    if (!analysis) return null;
    try {
      return generateMechanismTreatments(analysis);
    } catch (err) {
      console.error('[MechanismTreatment] Engine error:', err);
      return null;
    }
  }, [analysis]);

  const exportTreatments = useCallback(() => {
    if (!treatmentResult) return;
    const lines: string[] = [];
    lines.push('═══ MECHANISM-BASED TREATMENT PLAN ═══');
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push(treatmentResult.summary.overallPlan);
    lines.push('');

    if (treatmentResult.summary.approachSequence.length > 0) {
      lines.push('── TREATMENT SEQUENCE ──');
      treatmentResult.summary.approachSequence.forEach((step, i) => {
        lines.push(`  ${i + 1}. ${step}`);
      });
      lines.push('');
    }

    for (const target of treatmentResult.targets) {
      lines.push(`── ${target.structure.toUpperCase()} (${CATEGORY_LABELS[target.category]}, ${target.severity}) ──`);
      lines.push(`  Action: ${target.action}`);
      lines.push(`  Finding: ${target.finding}`);
      lines.push(`  Mechanism: ${target.mechanism}`);
      lines.push('  Interventions:');
      for (const tech of target.techniques) {
        lines.push(`    • ${tech.name} [${tech.evidenceGrade}]`);
        lines.push(`      Dosage: ${tech.dosage}`);
        lines.push(`      Rationale: ${tech.rationale}`);
      }
      lines.push('');
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopied(false);
    });
  }, [treatmentResult]);

  if (!analysis || !treatmentResult || treatmentResult.targets.length === 0) {
    return (
      <div className="text-center py-3">
        <Shield className="h-5 w-5 text-gray-600 mx-auto mb-1" />
        <p className="text-[10px] text-gray-500">No treatment targets identified</p>
        <p className="text-[9px] text-gray-600">Add pain markers, set pathologies, or adjust posture to generate treatment recommendations</p>
      </div>
    );
  }

  const { summary } = treatmentResult;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white">Treatment Plan</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-gray-400 hover:text-white"
          onClick={exportTreatments}
        >
          {copied ? <Check className="w-3 h-3 mr-1 text-green-400" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? 'Copied' : 'Export'}
        </Button>
      </div>

      <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-2.5">
        <span className="text-[11px] text-gray-400">{summary.overallPlan}</span>
        {summary.approachSequence.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {summary.approachSequence.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="w-2.5 h-2.5 text-gray-600" />}
                <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 text-gray-300 border-gray-600/50">
                  {step}
                </Badge>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-2 flex-wrap">
          {summary.rootCauses > 0 && (
            <span className="text-[9px] text-red-400">{summary.rootCauses} root cause{summary.rootCauses > 1 ? 's' : ''}</span>
          )}
          {summary.compensations > 0 && (
            <span className="text-[9px] text-purple-400">{summary.compensations} compensation{summary.compensations > 1 ? 's' : ''}</span>
          )}
          {summary.overloadedJoints > 0 && (
            <span className="text-[9px] text-orange-400">{summary.overloadedJoints} overloaded</span>
          )}
          {summary.chainDysfunctions > 0 && (
            <span className="text-[9px] text-cyan-400">{summary.chainDysfunctions} chain</span>
          )}
        </div>
      </div>

      <Separator className="bg-gray-700/50" />

      <div className="space-y-1.5">
        {treatmentResult.targets.map((target, i) => (
          <TargetCard key={target.id} target={target} defaultOpen={i === 0} />
        ))}
      </div>

      {treatmentResult.fullTargetCount > treatmentResult.targets.length && (
        <div className="text-center py-1.5">
          <p className="text-[9px] text-gray-500">
            Showing top {treatmentResult.targets.length} of {treatmentResult.fullTargetCount} targets.{' '}
            {onNavigateToDecisionTab ? (
              <button
                onClick={onNavigateToDecisionTab}
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
              >
                See full clinical plan in Decision tab →
              </button>
            ) : (
              <span className="text-emerald-400">See full clinical plan in Decision tab →</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
