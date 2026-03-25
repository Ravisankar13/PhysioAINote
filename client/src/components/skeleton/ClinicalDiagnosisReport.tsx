import { useState, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown, ChevronUp, Stethoscope, Target, Activity, ClipboardList, TrendingUp, BookOpen, AlertTriangle, Shield, Dumbbell, GraduationCap, Zap } from "lucide-react";

interface RootCause {
  cause: string;
  type: string;
  severity: string;
  confidence?: string;
  evidence: string;
  downstream_effects: string;
}

interface Intervention {
  type: string;
  name: string;
  target: string;
  dosage: string;
  rationale: string;
}

interface TreatmentPhase {
  duration: string;
  goals: string[];
  interventions: Intervention[];
}

interface Milestone {
  week: number | string;
  milestone: string;
  measure: string;
}

interface EvidenceCitation {
  claim: string;
  citation: string;
  pmid: string;
  grade: string;
}

export interface DiagnosisReport {
  primary_diagnosis: {
    name: string;
    icd_code?: string;
    confidence: string;
    clinical_reasoning: string;
  } | null;
  differential_diagnoses: Array<{ name: string; reasoning: string }>;
  root_causes: RootCause[];
  biomechanical_analysis: {
    postural_summary: string;
    kinetic_chain_issues: string[];
    compensation_patterns: string[];
    force_distribution: string;
  } | null;
  treatment_plan: {
    phase_1_acute: TreatmentPhase;
    phase_2_recovery: TreatmentPhase;
    phase_3_maintenance: TreatmentPhase;
    contraindications: string[];
    red_flags: string[];
  } | null;
  prognosis: {
    expected_timeline: string;
    favorable_factors: string[];
    risk_factors: string[];
    milestones: Milestone[];
  } | null;
  evidence_citations: EvidenceCitation[];
}

interface ClinicalDiagnosisReportProps {
  report: DiagnosisReport;
  isOpen: boolean;
  onClose: () => void;
}

const ROOT_CAUSE_TYPE_COLORS: Record<string, string> = {
  muscle_tightness: "bg-red-900/40 text-red-300 border-red-700/30",
  muscle_weakness: "bg-orange-900/40 text-orange-300 border-orange-700/30",
  fascial_tension: "bg-purple-900/40 text-purple-300 border-purple-700/30",
  joint_restriction: "bg-blue-900/40 text-blue-300 border-blue-700/30",
  postural_deviation: "bg-amber-900/40 text-amber-300 border-amber-700/30",
  neural_tension: "bg-cyan-900/40 text-cyan-300 border-cyan-700/30",
  motor_control_deficit: "bg-green-900/40 text-green-300 border-green-700/30",
};

const ROOT_CAUSE_TYPE_LABELS: Record<string, string> = {
  muscle_tightness: "Muscle Tightness",
  muscle_weakness: "Muscle Weakness",
  fascial_tension: "Fascial Tension",
  joint_restriction: "Joint Restriction",
  postural_deviation: "Postural Deviation",
  neural_tension: "Neural Tension",
  motor_control_deficit: "Motor Control Deficit",
};

const INTERVENTION_ICONS: Record<string, typeof Dumbbell> = {
  manual_therapy: Target,
  exercise: Dumbbell,
  education: GraduationCap,
  modality: Zap,
};

function SectionHeader({ icon: Icon, title, color, children }: { icon: typeof Stethoscope; title: string; color: string; children?: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-700/50 pb-2">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-1.5 mb-1.5 hover:opacity-80 transition-opacity">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[11px] font-semibold text-gray-100 flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
      </button>
      {open && children}
    </div>
  );
}

export default function ClinicalDiagnosisReport({ report, isOpen, onClose }: ClinicalDiagnosisReportProps) {
  const [activePhase, setActivePhase] = useState<"phase_1_acute" | "phase_2_recovery" | "phase_3_maintenance">("phase_1_acute");

  if (!isOpen) return null;

  const confidenceColor = report.primary_diagnosis?.confidence === "high" ? "text-green-400" :
    report.primary_diagnosis?.confidence === "moderate" ? "text-amber-400" : "text-red-400";

  const severityColor = (severity: string) =>
    severity === "severe" ? "text-red-400" : severity === "moderate" ? "text-amber-400" : "text-green-400";

  const activePhaseData = report.treatment_plan?.[activePhase];

  return (
    <div className="bg-gray-900/98 backdrop-blur-xl rounded-xl shadow-2xl border border-emerald-500/30 overflow-hidden w-[340px] max-h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-emerald-900/20 border-b border-emerald-500/20">
        <div className="flex items-center gap-1.5">
          <Stethoscope className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">Diagnosis & Treatment Report</span>
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-gray-700/60 text-gray-400 hover:text-white transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 space-y-3">

          {report.primary_diagnosis && (
            <SectionHeader icon={Stethoscope} title="Primary Diagnosis" color="text-emerald-400">
              <div className="rounded-lg bg-emerald-900/15 border border-emerald-700/25 p-2">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[12px] font-bold text-white leading-tight">{report.primary_diagnosis.name}</span>
                  <Badge variant="secondary" className={`text-[8px] px-1.5 py-0 shrink-0 ${report.primary_diagnosis.confidence === 'high' ? 'bg-green-900/40 text-green-300 border-green-700/30' : report.primary_diagnosis.confidence === 'moderate' ? 'bg-amber-900/40 text-amber-300 border-amber-700/30' : 'bg-red-900/40 text-red-300 border-red-700/30'}`}>
                    {report.primary_diagnosis.confidence} confidence
                  </Badge>
                </div>
                {report.primary_diagnosis.icd_code && (
                  <span className="text-[8px] text-gray-500 block mb-1">ICD-10: {report.primary_diagnosis.icd_code}</span>
                )}
                <p className="text-[10px] text-gray-300 leading-relaxed">{report.primary_diagnosis.clinical_reasoning}</p>
              </div>

              {report.differential_diagnoses.length > 0 && (
                <div className="mt-1.5">
                  <span className="text-[8px] text-gray-500 uppercase tracking-wider">Differential Diagnoses</span>
                  <div className="space-y-0.5 mt-0.5">
                    {report.differential_diagnoses.map((dd, i) => (
                      <div key={i} className="flex items-start gap-1 text-[9px]">
                        <span className="text-gray-500 shrink-0">{i + 1}.</span>
                        <span className="text-gray-300 font-medium">{dd.name}</span>
                        <span className="text-gray-500">— {dd.reasoning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionHeader>
          )}

          {report.root_causes.length > 0 && (
            <SectionHeader icon={Target} title={`Root Causes (${report.root_causes.length})`} color="text-red-400">
              <div className="space-y-1.5">
                {report.root_causes.map((rc, i) => (
                  <div key={i} className="rounded bg-gray-800/60 border border-gray-700/40 p-2">
                    <div className="flex items-start gap-1.5 mb-1">
                      <span className={`text-[11px] font-medium flex-1 leading-tight ${severityColor(rc.severity)}`}>{rc.cause}</span>
                      <Badge variant="secondary" className={`text-[7px] px-1 py-0 shrink-0 ${ROOT_CAUSE_TYPE_COLORS[rc.type] || 'bg-gray-700/40 text-gray-400'}`}>
                        {ROOT_CAUSE_TYPE_LABELS[rc.type] || rc.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${rc.severity === 'severe' ? 'bg-red-500' : rc.severity === 'moderate' ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <span className="text-[8px] text-gray-500">{rc.severity}</span>
                      {rc.confidence && (
                        <Badge variant="outline" className={`text-[7px] px-1 py-0 ml-1 ${rc.confidence === 'confirmed' ? 'border-green-600/50 text-green-400' : 'border-amber-600/50 text-amber-400'}`}>
                          {rc.confidence === 'confirmed' ? 'Confirmed' : 'Predicted'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400 leading-snug mb-0.5">
                      <span className="text-gray-500">Evidence: </span>{rc.evidence}
                    </p>
                    <p className="text-[9px] text-amber-400/70 leading-snug">
                      <span className="text-gray-500">Effects: </span>{rc.downstream_effects}
                    </p>
                  </div>
                ))}
              </div>
            </SectionHeader>
          )}

          {report.biomechanical_analysis && (
            <SectionHeader icon={Activity} title="Biomechanical Analysis" color="text-blue-400">
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-300 leading-relaxed">{report.biomechanical_analysis.postural_summary}</p>

                {report.biomechanical_analysis.kinetic_chain_issues.length > 0 && (
                  <div>
                    <span className="text-[8px] text-blue-400 uppercase tracking-wider">Kinetic Chain Issues</span>
                    <div className="space-y-0.5 mt-0.5">
                      {report.biomechanical_analysis.kinetic_chain_issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-1 text-[9px]">
                          <span className="text-blue-500 shrink-0 mt-0.5">•</span>
                          <span className="text-gray-300">{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.biomechanical_analysis.compensation_patterns.length > 0 && (
                  <div>
                    <span className="text-[8px] text-amber-400 uppercase tracking-wider">Compensation Patterns</span>
                    <div className="space-y-0.5 mt-0.5">
                      {report.biomechanical_analysis.compensation_patterns.map((cp, i) => (
                        <div key={i} className="flex items-start gap-1 text-[9px]">
                          <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                          <span className="text-gray-300">{cp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.biomechanical_analysis.force_distribution && (
                  <p className="text-[9px] text-gray-400 italic leading-snug">{report.biomechanical_analysis.force_distribution}</p>
                )}
              </div>
            </SectionHeader>
          )}

          {report.treatment_plan && (
            <SectionHeader icon={ClipboardList} title="Treatment Plan" color="text-green-400">
              <div className="space-y-2">
                <div className="flex gap-1">
                  {(["phase_1_acute", "phase_2_recovery", "phase_3_maintenance"] as const).map(phase => (
                    <button
                      key={phase}
                      onClick={() => setActivePhase(phase)}
                      className={`text-[8px] px-2 py-1 rounded-md transition-colors ${activePhase === phase ? 'bg-green-600/30 text-green-300 border border-green-500/40' : 'bg-gray-800/50 text-gray-400 border border-gray-700/40 hover:bg-gray-700/50'}`}
                    >
                      {phase === "phase_1_acute" ? "Phase 1: Acute" : phase === "phase_2_recovery" ? "Phase 2: Recovery" : "Phase 3: Maintain"}
                    </button>
                  ))}
                </div>

                {activePhaseData && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-gray-500">{activePhaseData.duration}</span>

                    {activePhaseData.goals && activePhaseData.goals.length > 0 && (
                      <div>
                        <span className="text-[8px] text-green-400/80 uppercase tracking-wider">Goals</span>
                        {activePhaseData.goals.map((goal, i) => (
                          <div key={i} className="flex items-start gap-1 text-[9px] mt-0.5">
                            <span className="text-green-500 shrink-0">✓</span>
                            <span className="text-gray-300">{goal}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activePhaseData.interventions && activePhaseData.interventions.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[8px] text-green-400/80 uppercase tracking-wider">Interventions</span>
                        {activePhaseData.interventions.map((intv, i) => {
                          const IIcon = INTERVENTION_ICONS[intv.type] || ClipboardList;
                          return (
                            <div key={i} className="rounded bg-gray-800/50 border border-gray-700/30 p-1.5">
                              <div className="flex items-center gap-1 mb-0.5">
                                <IIcon className="h-2.5 w-2.5 text-green-400" />
                                <span className="text-[10px] font-medium text-gray-200">{intv.name}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-0.5">
                                <Badge variant="secondary" className="text-[7px] px-1 py-0 bg-gray-700/40 text-gray-400">{intv.type.replace(/_/g, ' ')}</Badge>
                                {intv.dosage && <Badge variant="secondary" className="text-[7px] px-1 py-0 bg-blue-900/30 text-blue-300">{intv.dosage}</Badge>}
                              </div>
                              <p className="text-[8px] text-gray-500 leading-snug">
                                <span className="text-gray-400">Target: </span>{intv.target}
                              </p>
                              <p className="text-[8px] text-gray-500 leading-snug">{intv.rationale}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {report.treatment_plan.contraindications && report.treatment_plan.contraindications.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Shield className="h-2.5 w-2.5 text-red-400" />
                      <span className="text-[8px] text-red-400 uppercase tracking-wider">Contraindications</span>
                    </div>
                    {report.treatment_plan.contraindications.map((c, i) => (
                      <div key={i} className="flex items-start gap-1 text-[9px]">
                        <span className="text-red-500 shrink-0">⚠</span>
                        <span className="text-red-300/80">{c}</span>
                      </div>
                    ))}
                  </div>
                )}

                {report.treatment_plan.red_flags && report.treatment_plan.red_flags.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                      <span className="text-[8px] text-amber-400 uppercase tracking-wider">Red Flags</span>
                    </div>
                    {report.treatment_plan.red_flags.map((rf, i) => (
                      <div key={i} className="flex items-start gap-1 text-[9px]">
                        <span className="text-amber-500 shrink-0">!</span>
                        <span className="text-amber-300/80">{rf}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionHeader>
          )}

          {report.prognosis && (
            <SectionHeader icon={TrendingUp} title="Prognosis & Milestones" color="text-purple-400">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-gray-500">Expected Timeline:</span>
                  <span className="text-[10px] font-medium text-purple-300">{report.prognosis.expected_timeline}</span>
                </div>

                {report.prognosis.favorable_factors && report.prognosis.favorable_factors.length > 0 && (
                  <div>
                    <span className="text-[8px] text-green-400/80 uppercase tracking-wider">Favorable Factors</span>
                    {report.prognosis.favorable_factors.map((f, i) => (
                      <div key={i} className="flex items-start gap-1 text-[9px] mt-0.5">
                        <span className="text-green-500 shrink-0">+</span>
                        <span className="text-gray-300">{f}</span>
                      </div>
                    ))}
                  </div>
                )}

                {report.prognosis.risk_factors && report.prognosis.risk_factors.length > 0 && (
                  <div>
                    <span className="text-[8px] text-red-400/80 uppercase tracking-wider">Risk Factors</span>
                    {report.prognosis.risk_factors.map((r, i) => (
                      <div key={i} className="flex items-start gap-1 text-[9px] mt-0.5">
                        <span className="text-red-500 shrink-0">−</span>
                        <span className="text-gray-300">{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {report.prognosis.milestones && report.prognosis.milestones.length > 0 && (
                  <div>
                    <span className="text-[8px] text-purple-400/80 uppercase tracking-wider">Milestones</span>
                    <div className="space-y-1 mt-0.5">
                      {report.prognosis.milestones.map((m, i) => (
                        <div key={i} className="flex items-start gap-2 text-[9px] rounded bg-purple-900/10 border border-purple-700/20 px-1.5 py-1">
                          <span className="text-purple-400 font-bold shrink-0">Wk {m.week}</span>
                          <div className="flex-1">
                            <span className="text-gray-200">{m.milestone}</span>
                            {m.measure && <p className="text-[8px] text-gray-500">{m.measure}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionHeader>
          )}

          {report.evidence_citations && report.evidence_citations.length > 0 && (
            <SectionHeader icon={BookOpen} title={`Evidence (${report.evidence_citations.length})`} color="text-cyan-400">
              <div className="space-y-1">
                {report.evidence_citations.map((ec, i) => (
                  <div key={i} className="rounded bg-cyan-900/10 border border-cyan-700/20 p-1.5">
                    <p className="text-[9px] text-gray-300 leading-snug mb-0.5">{ec.claim}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[8px] text-cyan-400">{ec.citation}</span>
                      {ec.pmid && (
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${ec.pmid}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[7px] text-cyan-500 hover:text-cyan-300 underline"
                        >
                          PMID: {ec.pmid}
                        </a>
                      )}
                      {ec.grade && (
                        <Badge variant="secondary" className={`text-[7px] px-1 py-0 ${ec.grade === 'A' ? 'bg-green-900/40 text-green-300' : ec.grade === 'B' ? 'bg-blue-900/40 text-blue-300' : 'bg-gray-700/40 text-gray-400'}`}>
                          Grade {ec.grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionHeader>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
