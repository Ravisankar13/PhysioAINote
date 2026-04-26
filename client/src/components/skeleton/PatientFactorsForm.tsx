import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ChevronUp, HeartPulse, History, Moon, Brain, Briefcase, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type PatientFactors,
  type MenopausalStatus,
  type ImagingFindings,
  type ProteinIntake,
  type DailyStepsBand,
  type SocialSupportLevel,
  type LiftingFrequency,
  type RepetitiveTaskExposure,
  type SportSurface,
  type DiabetesStatus,
  type SmokingStatus,
  type SleepQuality,
  DEFAULT_PATIENT_FACTORS,
} from "@/lib/patientFactorsEngine";

/**
 * Task #240 — Structured Patient Factors form.
 *
 * Five collapsible groups whose fields each map to a named simulator
 * multiplier (see patientFactorsEngine.computePatientModifiers for the
 * documented coefficients). Fully controlled by the parent so the
 * effective `PatientFactors` object can be re-derived (auto-populate
 * + user overrides) and persisted per case.
 */

export interface PatientFactorsFormProps {
  factors: PatientFactors;
  onChange: (next: PatientFactors) => void;
  /** When provided, the "Reset to auto-detected" button restores the
   *  pipeline-derived factors instead of the global defaults. */
  autoDetected?: PatientFactors;
  /** Counts of factors edited away from auto-detected — drives the
   *  badge in the form header. */
  overriddenCount?: number;
  className?: string;
}

interface SectionDef {
  id: string;
  label: string;
  Icon: typeof HeartPulse;
  tone: string;
}

const SECTIONS: SectionDef[] = [
  { id: "comorbidities", label: "Comorbidities & lifestyle", Icon: HeartPulse, tone: "border-rose-500/30 bg-rose-500/5" },
  { id: "tissue_history", label: "Tissue quality & history", Icon: History, tone: "border-amber-500/30 bg-amber-500/5" },
  { id: "sleep_nutrition", label: "Sleep · nutrition · activity", Icon: Moon, tone: "border-emerald-500/30 bg-emerald-500/5" },
  { id: "psychosocial", label: "Psychosocial granularity", Icon: Brain, tone: "border-violet-500/30 bg-violet-500/5" },
  { id: "occupational", label: "Occupational specifics", Icon: Briefcase, tone: "border-sky-500/30 bg-sky-500/5" },
];

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] font-medium text-slate-300 flex items-center gap-1">
        {label}
        {hint && <span className="text-[9px] text-slate-500 font-normal">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  testId,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  testId?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value === null ? "" : value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return onChange(null);
        const n = parseFloat(raw);
        if (Number.isNaN(n)) return;
        onChange(n);
      }}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className="h-7 text-[11.5px] bg-slate-950/70 border-slate-700/70 text-slate-100 placeholder:text-slate-500"
      data-testid={testId}
    />
  );
}

function Sel<T extends string>({
  value,
  options,
  onChange,
  testId,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  testId?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full h-7 text-[11.5px] bg-slate-950/70 border border-slate-700/70 text-slate-100 rounded px-1.5"
      data-testid={testId}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "px-2 py-0.5 rounded-full text-[10.5px] border transition-colors text-left",
        checked
          ? "bg-violet-500/30 border-violet-300/60 text-violet-50"
          : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-violet-500/40",
      )}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

function Slider01({
  value,
  onChange,
  testId,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value ?? 50}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="flex-1 accent-violet-500"
        data-testid={testId}
      />
      <span className={cn("text-[10px] tabular-nums w-9 text-right", value === null ? "text-slate-500" : "text-slate-200")}>
        {value === null ? "—" : value}
      </span>
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[9px] text-slate-500 hover:text-slate-300"
          aria-label="Clear"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function PatientFactorsForm({
  factors,
  onChange,
  autoDetected,
  overriddenCount,
  className,
}: PatientFactorsFormProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    comorbidities: false,
    tissue_history: false,
    sleep_nutrition: false,
    psychosocial: false,
    occupational: false,
  });

  const set = <K extends keyof PatientFactors>(k: K, v: PatientFactors[K]) => onChange({ ...factors, [k]: v });
  const setMed = <K extends keyof PatientFactors["currentMedications"]>(k: K, v: boolean) =>
    onChange({ ...factors, currentMedications: { ...factors.currentMedications, [k]: v } });

  const filledCount = useMemo(() => {
    // Count any non-default values (user-set or pipeline-set) so the
    // header badge gives a quick "this case has X structured facts".
    let n = 0;
    if (factors.menopausalStatus !== "unknown") n++;
    const meds = factors.currentMedications;
    if (meds.nsaids || meds.oralCorticosteroids || meds.statins || meds.anticoagulants) n++;
    if (factors.bmiNumeric !== null) n++;
    if (factors.timeSinceLastEpisodeMonths !== null) n++;
    if (factors.priorSurgeryArea) n++;
    if (factors.keyImagingFindings !== "unknown") n++;
    if (factors.sleepHours !== null) n++;
    if (factors.proteinIntake !== "unknown") n++;
    if (factors.dailyStepsBand !== "unknown") n++;
    if (factors.trainingAgeYears !== null) n++;
    if (factors.kinesiophobia !== null) n++;
    if (factors.painCatastrophizing !== null) n++;
    if (factors.selfEfficacy !== null) n++;
    if (factors.perceivedStress !== null) n++;
    if (factors.socialSupport !== "unknown") n++;
    if (factors.sittingHoursPerDay !== null) n++;
    if (factors.liftingFrequency !== "unknown") n++;
    if (factors.repetitiveTaskExposure !== "unknown") n++;
    if (factors.sportPosition.trim()) n++;
    if (factors.sportSurface !== "unknown") n++;
    return n;
  }, [factors]);

  const toggleSection = (id: string) => setOpenSections((p) => ({ ...p, [id]: !p[id] }));

  return (
    <Card className={cn("border-slate-700/60 bg-slate-900/80", className)} data-testid="card-patient-factors-form">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-3.5 w-3.5 text-emerald-300" />
          <span className="text-[12px] font-semibold text-slate-100">Structured patient factors</span>
          {filledCount > 0 && (
            <Badge variant="outline" className="h-5 text-[10px] border-emerald-500/40 text-emerald-200 bg-emerald-500/10">
              {filledCount} filled
            </Badge>
          )}
          {overriddenCount !== undefined && overriddenCount > 0 && (
            <Badge variant="outline" className="h-5 text-[10px] border-violet-500/40 text-violet-200 bg-violet-500/10">
              {overriddenCount} edited
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {autoDetected && overriddenCount !== undefined && overriddenCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-slate-400 hover:text-slate-100 px-1.5"
              onClick={() => onChange(autoDetected)}
              data-testid="button-patient-factors-reset"
              title="Restore the pipeline-derived values"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-slate-100"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand patient factors" : "Collapse patient factors"}
            data-testid="button-patient-factors-toggle"
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {SECTIONS.map((section) => {
            const isOpen = openSections[section.id];
            return (
              <div key={section.id} className={cn("rounded border", section.tone)}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-white/5"
                  data-testid={`button-section-${section.id}`}
                >
                  <span className="flex items-center gap-1.5">
                    <section.Icon className="h-3 w-3 text-slate-200" />
                    <span className="text-[11px] font-semibold text-slate-100">{section.label}</span>
                  </span>
                  {isOpen ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-2 pb-2 pt-1 space-y-2">
                    {section.id === "comorbidities" && (
                      <>
                        <FieldRow label="Diabetes" hint="type1: healing ×0.7 · type2: ×0.8">
                          <Sel
                            value={factors.diabetes}
                            options={[
                              { value: "none", label: "None" },
                              { value: "prediabetic", label: "Prediabetic" },
                              { value: "type2", label: "Type 2" },
                              { value: "type1", label: "Type 1" },
                            ]}
                            onChange={(v) => set("diabetes", v)}
                            testId="select-diabetes"
                          />
                        </FieldRow>
                        <FieldRow label="Smoking status" hint="current: healing ×0.75, recurrence ×1.3">
                          <Sel
                            value={factors.smoking}
                            options={[
                              { value: "never", label: "Never" },
                              { value: "former", label: "Former" },
                              { value: "current", label: "Current" },
                            ]}
                            onChange={(v) => set("smoking", v)}
                            testId="select-smoking"
                          />
                        </FieldRow>
                        <FieldRow label="Menopausal status" hint="postmenopausal: healing & tissue ×0.92">
                          <Sel
                            value={factors.menopausalStatus}
                            options={[
                              { value: "unknown", label: "Unknown / not asked" },
                              { value: "not_applicable", label: "Not applicable" },
                              { value: "premenopausal", label: "Premenopausal" },
                              { value: "perimenopausal", label: "Perimenopausal" },
                              { value: "postmenopausal", label: "Postmenopausal" },
                            ]}
                            onChange={(v) => set("menopausalStatus", v)}
                            testId="select-menopausal"
                          />
                        </FieldRow>
                        <FieldRow label="Current medications" hint="affect tissue & healing">
                          <div className="flex flex-wrap gap-1">
                            <Toggle checked={factors.currentMedications.nsaids} onChange={(v) => setMed("nsaids", v)} label="Chronic NSAIDs" testId="toggle-med-nsaids" />
                            <Toggle checked={factors.currentMedications.oralCorticosteroids} onChange={(v) => setMed("oralCorticosteroids", v)} label="Oral corticosteroids" testId="toggle-med-steroids" />
                            <Toggle checked={factors.currentMedications.statins} onChange={(v) => setMed("statins", v)} label="Statins" testId="toggle-med-statins" />
                            <Toggle checked={factors.currentMedications.anticoagulants} onChange={(v) => setMed("anticoagulants", v)} label="Anticoagulants" testId="toggle-med-anticoag" />
                          </div>
                        </FieldRow>
                        <FieldRow label="BMI (numeric)" hint="optional, refines category">
                          <NumInput
                            value={factors.bmiNumeric}
                            onChange={(v) => set("bmiNumeric", v)}
                            placeholder="e.g. 27.4"
                            min={10}
                            max={70}
                            step={0.1}
                            testId="input-bmi-numeric"
                          />
                        </FieldRow>
                      </>
                    )}

                    {section.id === "tissue_history" && (
                      <>
                        <FieldRow label="Prior episodes (count)" hint="≥3: recurrence ×1.5 · 1–2: ×1.2">
                          <NumInput
                            value={factors.previousEpisodes}
                            onChange={(v) => set("previousEpisodes", v ?? 0)}
                            placeholder="0"
                            min={0}
                            max={50}
                            step={1}
                            testId="input-previous-episodes"
                          />
                        </FieldRow>
                        <FieldRow label="Time since last episode (months)" hint="<3mo: tissue ×0.95, recurrence ×1.2">
                          <NumInput
                            value={factors.timeSinceLastEpisodeMonths}
                            onChange={(v) => set("timeSinceLastEpisodeMonths", v)}
                            placeholder="e.g. 6"
                            min={0}
                            max={240}
                            step={1}
                            testId="input-time-since-episode"
                          />
                        </FieldRow>
                        <FieldRow label="Prior surgery in this area">
                          <div className="flex gap-1">
                            <Toggle checked={factors.priorSurgeryArea} onChange={(v) => set("priorSurgeryArea", v)} label={factors.priorSurgeryArea ? "Yes" : "No"} testId="toggle-prior-surgery" />
                          </div>
                        </FieldRow>
                        <FieldRow label="Key imaging findings">
                          <Sel
                            value={factors.keyImagingFindings}
                            options={[
                              { value: "unknown", label: "Unknown / no imaging" },
                              { value: "none", label: "Unremarkable" },
                              { value: "mild_degenerative", label: "Mild degenerative" },
                              { value: "moderate_degenerative", label: "Moderate degenerative" },
                              { value: "severe_degenerative", label: "Severe degenerative" },
                              { value: "structural_lesion", label: "Discrete structural lesion" },
                            ]}
                            onChange={(v) => set("keyImagingFindings", v)}
                            testId="select-imaging"
                          />
                        </FieldRow>
                      </>
                    )}

                    {section.id === "sleep_nutrition" && (
                      <>
                        <FieldRow label="Sleep quality" hint="poor: healing ×0.8, pain ×1.25">
                          <Sel
                            value={factors.sleepQuality}
                            options={[
                              { value: "good", label: "Good" },
                              { value: "fair", label: "Fair" },
                              { value: "poor", label: "Poor" },
                            ]}
                            onChange={(v) => set("sleepQuality", v)}
                            testId="select-sleep-quality"
                          />
                        </FieldRow>
                        <FieldRow label="Sleep hours per night" hint="<6h: healing ×0.85, pain ×1.2">
                          <NumInput
                            value={factors.sleepHours}
                            onChange={(v) => set("sleepHours", v)}
                            placeholder="e.g. 7.5"
                            min={0}
                            max={14}
                            step={0.5}
                            testId="input-sleep-hours"
                          />
                        </FieldRow>
                        <FieldRow label="Protein intake" hint="low: tissue ×0.92">
                          <Sel
                            value={factors.proteinIntake}
                            options={[
                              { value: "unknown", label: "Unknown" },
                              { value: "low", label: "Low (<0.8 g/kg)" },
                              { value: "adequate", label: "Adequate (0.8–1.6 g/kg)" },
                              { value: "high", label: "High (>1.6 g/kg)" },
                            ]}
                            onChange={(v) => set("proteinIntake", v)}
                            testId="select-protein"
                          />
                        </FieldRow>
                        <FieldRow label="Daily steps band" hint="sedentary: healing ×0.92, recurrence ×1.1">
                          <Sel
                            value={factors.dailyStepsBand}
                            options={[
                              { value: "unknown", label: "Unknown" },
                              { value: "sedentary", label: "Sedentary (<3k)" },
                              { value: "low", label: "Low (3k–5k)" },
                              { value: "moderate", label: "Moderate (5k–8k)" },
                              { value: "active", label: "Active (8k–12k)" },
                              { value: "very_active", label: "Very active (12k+)" },
                            ]}
                            onChange={(v) => set("dailyStepsBand", v)}
                            testId="select-daily-steps"
                          />
                        </FieldRow>
                        <FieldRow label="Training age (years)" hint="≥5y: tissue ×1.05">
                          <NumInput
                            value={factors.trainingAgeYears}
                            onChange={(v) => set("trainingAgeYears", v)}
                            placeholder="e.g. 8"
                            min={0}
                            max={70}
                            step={0.5}
                            testId="input-training-age"
                          />
                        </FieldRow>
                      </>
                    )}

                    {section.id === "psychosocial" && (
                      <>
                        <FieldRow label="Kinesiophobia (0–100)" hint="≥60: psychosocial ×0.85">
                          <Slider01 value={factors.kinesiophobia} onChange={(v) => set("kinesiophobia", v)} testId="slider-kinesiophobia" />
                        </FieldRow>
                        <FieldRow label="Pain catastrophizing (0–100)" hint="≥60: pain ×1.25">
                          <Slider01 value={factors.painCatastrophizing} onChange={(v) => set("painCatastrophizing", v)} testId="slider-catastrophizing" />
                        </FieldRow>
                        <FieldRow label="Self-efficacy (0–100)" hint="≥70: psychosocial ×1.1">
                          <Slider01 value={factors.selfEfficacy} onChange={(v) => set("selfEfficacy", v)} testId="slider-self-efficacy" />
                        </FieldRow>
                        <FieldRow label="Perceived stress (0–100)" hint="≥60: healing ×0.9">
                          <Slider01 value={factors.perceivedStress} onChange={(v) => set("perceivedStress", v)} testId="slider-stress" />
                        </FieldRow>
                        <FieldRow label="Social support">
                          <Sel
                            value={factors.socialSupport}
                            options={[
                              { value: "unknown", label: "Unknown" },
                              { value: "low", label: "Low" },
                              { value: "moderate", label: "Moderate" },
                              { value: "high", label: "High" },
                            ]}
                            onChange={(v) => set("socialSupport", v)}
                            testId="select-social-support"
                          />
                        </FieldRow>
                      </>
                    )}

                    {section.id === "occupational" && (
                      <>
                        <FieldRow label="Sitting hours / day" hint="≥8h: recurrence ×1.15">
                          <NumInput
                            value={factors.sittingHoursPerDay}
                            onChange={(v) => set("sittingHoursPerDay", v)}
                            placeholder="e.g. 9"
                            min={0}
                            max={20}
                            step={0.5}
                            testId="input-sitting-hours"
                          />
                        </FieldRow>
                        <FieldRow label="Lifting frequency at work" hint="heavy repeated: recurrence ×1.3">
                          <Sel
                            value={factors.liftingFrequency}
                            options={[
                              { value: "unknown", label: "Unknown" },
                              { value: "none", label: "None" },
                              { value: "occasional", label: "Occasional" },
                              { value: "frequent", label: "Frequent" },
                              { value: "heavy_repeated", label: "Heavy / repeated" },
                            ]}
                            onChange={(v) => set("liftingFrequency", v)}
                            testId="select-lifting"
                          />
                        </FieldRow>
                        <FieldRow label="Repetitive task exposure" hint="high: recurrence ×1.2">
                          <Sel
                            value={factors.repetitiveTaskExposure}
                            options={[
                              { value: "unknown", label: "Unknown" },
                              { value: "none", label: "None" },
                              { value: "low", label: "Low" },
                              { value: "moderate", label: "Moderate" },
                              { value: "high", label: "High" },
                            ]}
                            onChange={(v) => set("repetitiveTaskExposure", v)}
                            testId="select-repetitive"
                          />
                        </FieldRow>
                        <FieldRow label="Sport position / role">
                          <Input
                            value={factors.sportPosition}
                            onChange={(e) => set("sportPosition", e.target.value)}
                            placeholder="e.g. pitcher, prop forward, distance runner"
                            className="h-7 text-[11.5px] bg-slate-950/70 border-slate-700/70 text-slate-100 placeholder:text-slate-500"
                            data-testid="input-sport-position"
                          />
                        </FieldRow>
                        <FieldRow label="Sport surface" hint="hard: recurrence ×1.1">
                          <Sel
                            value={factors.sportSurface}
                            options={[
                              { value: "unknown", label: "Unknown / N/A" },
                              { value: "soft", label: "Soft (grass, sand)" },
                              { value: "mixed", label: "Mixed" },
                              { value: "hard", label: "Hard (concrete, court)" },
                            ]}
                            onChange={(v) => set("sportSurface", v)}
                            testId="select-sport-surface"
                          />
                        </FieldRow>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
            Each field maps to a named simulator multiplier with a documented coefficient. Open the recovery simulator and check the "What's affecting this curve" panel to see how your edits move the prediction.
          </p>
        </div>
      )}
    </Card>
  );
}

/** Count fields where the user has overridden the auto-populated value. */
export function countFactorOverrides(current: PatientFactors, autoDetected: PatientFactors): number {
  let n = 0;
  // Must include every editable field surfaced in the form so the
  // "edited" badge is accurate. Includes the four pre-existing core
  // fields exposed in this form (diabetes / smoking / previousEpisodes
  // / sleepQuality) plus all five new structured groups.
  const keys: (keyof PatientFactors)[] = [
    // Pre-existing core fields surfaced in the form
    "diabetes", "smoking", "previousEpisodes", "sleepQuality",
    // Group 1–5 structured fields
    "menopausalStatus", "bmiNumeric", "timeSinceLastEpisodeMonths", "priorSurgeryArea",
    "keyImagingFindings", "sleepHours", "proteinIntake", "dailyStepsBand", "trainingAgeYears",
    "kinesiophobia", "painCatastrophizing", "selfEfficacy", "perceivedStress", "socialSupport",
    "sittingHoursPerDay", "liftingFrequency", "repetitiveTaskExposure", "sportPosition", "sportSurface",
  ];
  for (const k of keys) {
    if (JSON.stringify(current[k]) !== JSON.stringify(autoDetected[k])) n++;
  }
  if (JSON.stringify(current.currentMedications) !== JSON.stringify(autoDetected.currentMedications)) n++;
  return n;
}

export { DEFAULT_PATIENT_FACTORS };
