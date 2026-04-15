import type { SlingAnalysisResult, SlingResult, SlingId } from './slingEngine';
import type { SlingTissueRisk } from './slingTissuePressure';
import type { MuscleOverride } from './muscleBiomechanicsEngine';

export type ClinicalPhaseCategory =
  | 'pain_inflammation'
  | 'tissue_release'
  | 'mobility'
  | 'motor_control'
  | 'strengthening'
  | 'functional';

export interface SkeletonClinicalGoal {
  id: string;
  target: string;
  rationale: string;
  phase: ClinicalPhaseCategory;
  priority: number;
  source: 'pain' | 'biomechanics' | 'sling' | 'tissue' | 'muscle' | 'posture';
  region?: string;
  metric?: string;
}

export interface ClinicalPlanPhaseGroup {
  phase: ClinicalPhaseCategory;
  label: string;
  order: number;
  goals: SkeletonClinicalGoal[];
}

export interface ClinicalPlanResult {
  phases: ClinicalPlanPhaseGroup[];
  totalGoals: number;
  dominantSources: string[];
  summary: string;
}

const PHASE_ORDER: Record<ClinicalPhaseCategory, number> = {
  pain_inflammation: 1,
  tissue_release: 2,
  mobility: 3,
  motor_control: 4,
  strengthening: 5,
  functional: 6,
};

const PHASE_LABELS: Record<ClinicalPhaseCategory, string> = {
  pain_inflammation: 'Pain & Inflammation Control',
  tissue_release: 'Tissue Release & Decompression',
  mobility: 'Mobility Restoration',
  motor_control: 'Motor Control & Coordination',
  strengthening: 'Strengthening & Load Capacity',
  functional: 'Functional Integration',
};

interface PainMarkerInput {
  id: string;
  label: string;
  severity?: number;
  type?: string;
  description?: string;
}

interface BiomechanicsFault {
  label: string;
  severity: 'mild' | 'moderate' | 'severe';
  category: string;
  clinical: string;
  corrective: string;
}

interface BiomechanicsDeviation {
  pattern: string;
  region: string;
  severity: 'mild' | 'moderate' | 'severe';
  angleDeg: number;
}

interface BiomechanicsInput {
  faults?: BiomechanicsFault[];
  deviations?: BiomechanicsDeviation[];
  qualityScore?: number;
  clinicalSummary?: string;
}

interface PostureState {
  [group: string]: { [param: string]: number };
}

export interface ClinicalPlanSynthesizerInput {
  painMarkers?: PainMarkerInput[];
  biomechanics?: BiomechanicsInput;
  slingAnalysis?: SlingAnalysisResult | null;
  slingTissueRisks?: SlingTissueRisk[];
  muscleOverrides?: Record<string, Partial<MuscleOverride>>;
  postureState?: PostureState;
}

const SEVERITY_THRESHOLD = 3;

function synthesizePainGoals(markers: PainMarkerInput[]): SkeletonClinicalGoal[] {
  const goals: SkeletonClinicalGoal[] = [];
  let idx = 0;
  for (const m of markers) {
    const sev = m.severity ?? 5;
    if (sev < SEVERITY_THRESHOLD) continue;
    const sevLabel = sev >= 7 ? 'high' : sev >= 5 ? 'moderate' : 'mild';
    const region = m.label.replace(/_/g, ' ');
    goals.push({
      id: `pain_${idx++}`,
      target: `Decrease ${region} pain from ${sev}/10 to ≤${Math.max(1, Math.round(sev * 0.3))}/10`,
      rationale: `${region} reports ${sevLabel} pain intensity (${sev}/10)${m.type ? ` — ${m.type} pattern` : ''}${m.description ? `. ${m.description}` : ''}`,
      phase: sev >= 7 ? 'pain_inflammation' : 'pain_inflammation',
      priority: Math.min(100, sev * 12),
      source: 'pain',
      region,
      metric: `NRS ${sev}/10 → ≤${Math.max(1, Math.round(sev * 0.3))}/10`,
    });
  }
  return goals;
}

function synthesizeBiomechanicsGoals(bio: BiomechanicsInput): SkeletonClinicalGoal[] {
  const goals: SkeletonClinicalGoal[] = [];
  let idx = 0;

  if (bio.faults) {
    for (const f of bio.faults) {
      const sevScore = f.severity === 'severe' ? 80 : f.severity === 'moderate' ? 55 : 30;
      const phase: ClinicalPhaseCategory = f.category === 'alignment' || f.category === 'posture'
        ? 'mobility'
        : f.category === 'control' || f.category === 'motor_control'
          ? 'motor_control'
          : 'strengthening';
      goals.push({
        id: `bio_fault_${idx++}`,
        target: `Correct ${f.label}`,
        rationale: `${f.clinical}. Corrective: ${f.corrective}`,
        phase,
        priority: sevScore,
        source: 'biomechanics',
        region: f.category,
      });
    }
  }

  if (bio.deviations) {
    for (const d of bio.deviations) {
      if (d.angleDeg < 5) continue;
      const region = d.region.replace(/_/g, ' ');
      const sevScore = d.severity === 'severe' ? 70 : d.severity === 'moderate' ? 50 : 25;
      goals.push({
        id: `bio_dev_${idx++}`,
        target: `Reduce ${region} ${d.pattern} deviation (currently ${d.angleDeg}°)`,
        rationale: `${d.pattern} pattern at ${region} exceeds acceptable range by ${d.angleDeg}°`,
        phase: 'mobility',
        priority: sevScore,
        source: 'biomechanics',
        region,
        metric: `${d.angleDeg}° deviation`,
      });
    }
  }

  return goals;
}

const SLING_ID_LABELS: Record<string, string> = {
  posterior_oblique: 'posterior oblique sling',
  anterior_oblique: 'anterior oblique sling',
  lateral: 'lateral sling',
  deep_longitudinal: 'deep longitudinal sling',
  scapular_shoulder: 'scapular-shoulder sling',
};

function synthesizeSlingGoals(analysis: SlingAnalysisResult): SkeletonClinicalGoal[] {
  const goals: SkeletonClinicalGoal[] = [];
  let idx = 0;

  for (const sling of analysis.slings) {
    if (sling.status === 'normal' && sling.forceTransferQuality === 'good') continue;

    const slingLabel = SLING_ID_LABELS[sling.slingId] ?? sling.label;

    if (sling.forceTransferQuality !== 'good') {
      goals.push({
        id: `sling_ft_${idx++}`,
        target: `Restore ${slingLabel} force transfer (${sling.forceTransferQuality} → good)`,
        rationale: `${sling.label} activation ${sling.activationScore}% with ${sling.forceTransferQuality} force transfer quality`,
        phase: 'functional',
        priority: sling.forceTransferQuality === 'poor' ? 75 : 50,
        source: 'sling',
        metric: `${sling.activationScore}% activation`,
      });
    }

    for (const wl of sling.weakLinks) {
      const muscle = wl.muscle.replace(/_/g, ' ');
      goals.push({
        id: `sling_wl_${idx++}`,
        target: `Strengthen ${muscle} (${wl.activationPct}% → ≥60% activation)`,
        rationale: `Weak link in ${slingLabel}: ${muscle} at ${wl.activationPct}% activation — ${wl.impactOnSling}`,
        phase: wl.activationPct < 30 ? 'motor_control' : 'strengthening',
        priority: Math.min(90, Math.round((60 - wl.activationPct) * 1.4)),
        source: 'sling',
        region: muscle,
        metric: `${wl.activationPct}% → ≥60%`,
      });
    }

    for (const reroute of sling.forceReroutes) {
      const from = reroute.fromMuscle.replace(/_/g, ' ');
      const to = reroute.toMuscle.replace(/_/g, ' ');
      if (reroute.reroutePct < 15) continue;
      goals.push({
        id: `sling_rr_${idx++}`,
        target: `Reduce force reroute from ${from} to ${to} (${reroute.reroutePct}%)`,
        rationale: `${to} absorbing ${reroute.reroutePct}% rerouted force — overload risk`,
        phase: 'tissue_release',
        priority: Math.min(80, Math.round(reroute.reroutePct * 1.1)),
        source: 'sling',
        region: to,
        metric: `${reroute.reroutePct}% reroute`,
      });
    }
  }

  for (const comp of analysis.crossSlingCompensations) {
    if (comp.additionalLoadPct < 10) continue;
    goals.push({
      id: `sling_comp_${idx++}`,
      target: `Resolve ${comp.compensatingSlingLabel} compensating for ${comp.compensatedSlingLabel} (${comp.additionalLoadPct}% overload)`,
      rationale: `Cross-sling compensation: ${comp.compensatingSlingLabel} carrying ${comp.additionalLoadPct}% additional load for dysfunctional ${comp.compensatedSlingLabel}`,
      phase: 'motor_control',
      priority: Math.min(85, Math.round(comp.additionalLoadPct * 1.2)),
      source: 'sling',
    });
  }

  return goals;
}

function synthesizeTissueRiskGoals(risks: SlingTissueRisk[]): SkeletonClinicalGoal[] {
  const goals: SkeletonClinicalGoal[] = [];
  const seen = new Set<string>();
  let idx = 0;

  const sorted = [...risks].sort((a, b) => b.riskPercent - a.riskPercent);
  for (const r of sorted.slice(0, 8)) {
    const key = `${r.tissue_type}:${r.tissue_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (r.riskPercent < 20) continue;

    const tissueLabel = r.tissue_id.replace(/_/g, ' ');
    const typeLabel = r.tissue_type;
    const phase: ClinicalPhaseCategory = r.mechanism === 'weak_link' ? 'strengthening'
      : r.mechanism === 'force_reroute' ? 'tissue_release'
        : r.mechanism === 'cross_compensation' ? 'motor_control'
          : 'pain_inflammation';

    goals.push({
      id: `tissue_${idx++}`,
      target: `Protect ${tissueLabel} ${typeLabel} (${r.riskPercent}% risk via ${r.mechanism.replace(/_/g, ' ')})`,
      rationale: r.rationale,
      phase,
      priority: Math.min(85, r.riskPercent),
      source: 'tissue',
      region: tissueLabel,
      metric: `${r.riskPercent}% risk`,
    });
  }

  return goals;
}

const MUSCLE_LABELS: Record<string, string> = {
  trapezius_upper: 'upper trapezius',
  trapezius_lower: 'lower trapezius',
  levator_scapulae: 'levator scapulae',
  sternocleidomastoid: 'SCM',
  pectoralis_major: 'pectoralis major',
  pectoralis_minor: 'pectoralis minor',
  latissimus_dorsi: 'latissimus dorsi',
  deltoid: 'deltoid',
  infraspinatus: 'infraspinatus',
  subscapularis: 'subscapularis',
  supraspinatus: 'supraspinatus',
  teres_minor: 'teres minor',
  biceps_brachii: 'biceps brachii',
  triceps_brachii: 'triceps',
  erector_spinae: 'erector spinae',
  multifidus: 'multifidus',
  quadratus_lumborum: 'quadratus lumborum',
  psoas_major: 'psoas',
  iliacus: 'iliacus',
  rectus_abdominis: 'rectus abdominis',
  transversus_abdominis: 'transversus abdominis',
  obliquus_externus: 'external oblique',
  obliquus_internus: 'internal oblique',
  gluteus_maximus: 'gluteus maximus',
  gluteus_medius: 'gluteus medius',
  gluteus_minimus: 'gluteus minimus',
  tensor_fasciae_latae: 'TFL',
  piriformis: 'piriformis',
  adductor_longus: 'adductor longus',
  adductor_magnus: 'adductor magnus',
  rectus_femoris: 'rectus femoris',
  vastus_lateralis: 'vastus lateralis',
  vastus_medialis: 'VMO',
  biceps_femoris: 'biceps femoris',
  semitendinosus: 'semitendinosus',
  semimembranosus: 'semimembranosus',
  gastrocnemius: 'gastrocnemius',
  soleus: 'soleus',
  tibialis_anterior: 'tibialis anterior',
  peroneus_longus: 'peroneus longus',
};

function synthesizeMuscleGoals(overrides: Record<string, Partial<MuscleOverride>>): SkeletonClinicalGoal[] {
  const goals: SkeletonClinicalGoal[] = [];
  let idx = 0;

  for (const [muscleId, ov] of Object.entries(overrides)) {
    const tension = 50 + (ov.tensionOffset ?? 0);
    const pathology = ov.pathology;
    const label = MUSCLE_LABELS[muscleId] ?? muscleId.replace(/_/g, ' ');

    if (pathology === 'spasm' || pathology === 'trigger_point') {
      goals.push({
        id: `muscle_${idx++}`,
        target: `Release ${label} ${pathology === 'spasm' ? 'spasm' : 'trigger point'}`,
        rationale: `${label} has active ${pathology.replace(/_/g, ' ')} (tension ${tension}%)`,
        phase: 'tissue_release',
        priority: pathology === 'spasm' ? 75 : 65,
        source: 'muscle',
        region: label,
        metric: `tension ${tension}%`,
      });
    } else if (pathology === 'strain' || pathology === 'tear') {
      goals.push({
        id: `muscle_${idx++}`,
        target: `Rehabilitate ${label} ${pathology}`,
        rationale: `${label} ${pathology} requires graded loading protocol`,
        phase: 'pain_inflammation',
        priority: pathology === 'tear' ? 90 : 70,
        source: 'muscle',
        region: label,
      });
    } else if (pathology === 'weakness' || (tension < 35 && !pathology)) {
      goals.push({
        id: `muscle_${idx++}`,
        target: `Activate and strengthen ${label} (${tension}% tension)`,
        rationale: `${label} is ${pathology === 'weakness' ? 'clinically weak' : 'under-active'} at ${tension}% tension`,
        phase: tension < 25 ? 'motor_control' : 'strengthening',
        priority: Math.min(80, Math.round((50 - tension) * 1.5)),
        source: 'muscle',
        region: label,
        metric: `${tension}% → ≥50%`,
      });
    } else if (tension > 75) {
      goals.push({
        id: `muscle_${idx++}`,
        target: `Reduce ${label} hypertonicity (${tension}% → 50-60%)`,
        rationale: `${label} is hypertonic at ${tension}% — contributing to compression or movement restriction`,
        phase: 'tissue_release',
        priority: Math.min(70, Math.round((tension - 50) * 1.2)),
        source: 'muscle',
        region: label,
        metric: `${tension}% → 50-60%`,
      });
    }
  }

  return goals;
}

const POSTURE_GOALS: Record<string, Record<string, { label: string; phaseIfHigh: ClinicalPhaseCategory; phaseIfLow: ClinicalPhaseCategory; threshold: number }>> = {
  spine: {
    lumbarLordosis: { label: 'lumbar lordosis', phaseIfHigh: 'mobility', phaseIfLow: 'strengthening', threshold: 8 },
    thoracicKyphosis: { label: 'thoracic kyphosis', phaseIfHigh: 'mobility', phaseIfLow: 'mobility', threshold: 8 },
    forwardHead: { label: 'forward head posture', phaseIfHigh: 'mobility', phaseIfLow: 'mobility', threshold: 5 },
    lateralShift: { label: 'lateral trunk shift', phaseIfHigh: 'motor_control', phaseIfLow: 'motor_control', threshold: 3 },
  },
  pelvis: {
    anteriorTilt: { label: 'anterior pelvic tilt', phaseIfHigh: 'mobility', phaseIfLow: 'strengthening', threshold: 5 },
    lateralTilt: { label: 'lateral pelvic tilt', phaseIfHigh: 'motor_control', phaseIfLow: 'motor_control', threshold: 3 },
    rotation: { label: 'pelvic rotation', phaseIfHigh: 'motor_control', phaseIfLow: 'motor_control', threshold: 3 },
  },
  shoulder: {
    protraction: { label: 'shoulder protraction', phaseIfHigh: 'mobility', phaseIfLow: 'strengthening', threshold: 5 },
    elevation: { label: 'shoulder elevation asymmetry', phaseIfHigh: 'tissue_release', phaseIfLow: 'tissue_release', threshold: 3 },
  },
};

function synthesizePostureGoals(posture: PostureState): SkeletonClinicalGoal[] {
  const goals: SkeletonClinicalGoal[] = [];
  let idx = 0;

  for (const [group, params] of Object.entries(posture)) {
    const groupGoals = POSTURE_GOALS[group];
    if (!groupGoals) continue;

    for (const [param, value] of Object.entries(params)) {
      const config = groupGoals[param];
      if (!config) continue;
      const absVal = Math.abs(value);
      if (absVal < config.threshold) continue;

      const direction = value > 0 ? 'excessive' : 'reduced';
      const phase = value > 0 ? config.phaseIfHigh : config.phaseIfLow;

      goals.push({
        id: `posture_${idx++}`,
        target: `Correct ${direction} ${config.label} (${value > 0 ? '+' : ''}${value}°)`,
        rationale: `${config.label} deviates ${absVal}° from neutral (threshold ${config.threshold}°)`,
        phase,
        priority: Math.min(65, Math.round(absVal * 3)),
        source: 'posture',
        region: group,
        metric: `${value}° → 0°`,
      });
    }
  }

  return goals;
}

export function synthesizeClinicalPlan(input: ClinicalPlanSynthesizerInput): ClinicalPlanResult {
  const allGoals: SkeletonClinicalGoal[] = [];

  if (input.painMarkers && input.painMarkers.length > 0) {
    allGoals.push(...synthesizePainGoals(input.painMarkers));
  }

  if (input.biomechanics) {
    allGoals.push(...synthesizeBiomechanicsGoals(input.biomechanics));
  }

  if (input.slingAnalysis) {
    allGoals.push(...synthesizeSlingGoals(input.slingAnalysis));
  }

  if (input.slingTissueRisks && input.slingTissueRisks.length > 0) {
    allGoals.push(...synthesizeTissueRiskGoals(input.slingTissueRisks));
  }

  if (input.muscleOverrides && Object.keys(input.muscleOverrides).length > 0) {
    allGoals.push(...synthesizeMuscleGoals(input.muscleOverrides));
  }

  if (input.postureState && Object.keys(input.postureState).length > 0) {
    allGoals.push(...synthesizePostureGoals(input.postureState));
  }

  allGoals.sort((a, b) => b.priority - a.priority);

  const phaseMap = new Map<ClinicalPhaseCategory, SkeletonClinicalGoal[]>();
  for (const g of allGoals) {
    const arr = phaseMap.get(g.phase) ?? [];
    arr.push(g);
    phaseMap.set(g.phase, arr);
  }

  const phases: ClinicalPlanPhaseGroup[] = [];
  for (const [phase, goals] of phaseMap) {
    phases.push({
      phase,
      label: PHASE_LABELS[phase],
      order: PHASE_ORDER[phase],
      goals: goals.slice(0, 6),
    });
  }
  phases.sort((a, b) => a.order - b.order);

  const sourceCounts: Record<string, number> = {};
  for (const g of allGoals) {
    sourceCounts[g.source] = (sourceCounts[g.source] ?? 0) + 1;
  }
  const dominantSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  const topGoals = allGoals.slice(0, 3).map(g => g.target);
  const summary = allGoals.length === 0
    ? 'No skeleton findings to generate clinical plan.'
    : `${allGoals.length} clinical goals across ${phases.length} phases. Priority: ${topGoals.join('; ')}.`;

  return {
    phases,
    totalGoals: allGoals.length,
    dominantSources,
    summary,
  };
}
