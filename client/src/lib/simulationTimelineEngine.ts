import {
  type WhatIfScenario,
  type WhatIfComparisonResult,
  type InterventionType,
  applyScenarios,
  computeWhatIfComparison,
} from './whatIfSimulationEngine';
import { computeFullMuscleAnalysis, applyOverridesToAnalysis, type MuscleOverride, type MuscleAnalysisResult } from './muscleBiomechanicsEngine';
import { calculatePosturalForces } from './posturalForceEngine';
import { computeSlingAnalysis, type SlingAnalysisResult } from './slingEngine';
import type { TreatmentPlanResult, PlanPhase, PlanExercise } from '../components/skeleton/PlanTab';
import type { CustomExercise } from '../components/skeleton/ExerciseEngineTab';
import type { CustomTechnique } from '../components/skeleton/ManualTherapyEngineTab';
import type { PatientModifierProfile, ConditionRecoveryProfile } from './patientFactorsEngine';

export interface SimulationPhase {
  id: string;
  name: string;
  order: number;
  startWeek: number;
  endWeek: number;
  goals: string[];
  activeExercises: PhaseExerciseEntry[];
  activeManualTherapy: PhaseExerciseEntry[];
  advancementCriteria: string;
  frequency: string;
}

export interface PhaseExerciseEntry {
  name: string;
  category: string;
  sets: number;
  reps: string;
  intensity: string;
  targetRegions: string[];
  interventionType: InterventionType;
  target: string;
  targetType: 'muscle' | 'joint';
  magnitude: number;
  doseScale: number;
}

export interface WeekSnapshot {
  week: number;
  phaseId: string;
  phaseName: string;
  riskScore: number;
  riskLevel: string;
  painPrediction: number;
  forceReduction: number;
  compensationResolution: number;
  slingIntegrity: number;
  doseResponseFraction: number;
  activeScenarios: WhatIfScenario[];
  modelConfig: Record<string, Record<string, number>>;
  overrides: Record<string, Partial<MuscleOverride>>;
  forceMultiplier: number;
}

export interface SimulationTimelineResult {
  phases: SimulationPhase[];
  weekSnapshots: WeekSnapshot[];
  totalDurationWeeks: number;
  startingState: {
    riskScore: number;
    riskLevel: string;
    slingIntegrity: number;
    painBaseline: number;
  };
  endState: {
    riskScore: number;
    riskLevel: string;
    slingIntegrity: number;
    estimatedRecoveryWeeks: number;
  };
  milestones: SimulationMilestone[];
}

export interface SimulationMilestone {
  week: number;
  label: string;
  criteria?: string;
  type: 'phase_transition' | 'risk_reduction' | 'pain_milestone' | 'sling_improvement';
}

const EXERCISE_NAME_TO_TARGET: Record<string, { target: string; targetType: 'muscle' | 'joint'; intervention: InterventionType }> = {
  glute: { target: 'glute', targetType: 'muscle', intervention: 'strengthen' },
  gluteal: { target: 'glute', targetType: 'muscle', intervention: 'strengthen' },
  bridge: { target: 'glute', targetType: 'muscle', intervention: 'strengthen' },
  clam: { target: 'glute', targetType: 'muscle', intervention: 'strengthen' },
  hip_abduction: { target: 'glute', targetType: 'muscle', intervention: 'strengthen' },
  core: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  plank: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  dead_bug: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  bird_dog: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  abdominal: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  pallof: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  quad: { target: 'quad', targetType: 'muscle', intervention: 'strengthen' },
  squat: { target: 'quad', targetType: 'muscle', intervention: 'strengthen' },
  lunge: { target: 'quad', targetType: 'muscle', intervention: 'strengthen' },
  leg_press: { target: 'quad', targetType: 'muscle', intervention: 'strengthen' },
  hamstring: { target: 'hamstring', targetType: 'muscle', intervention: 'strengthen' },
  curl: { target: 'hamstring', targetType: 'muscle', intervention: 'strengthen' },
  deadlift: { target: 'hamstring', targetType: 'muscle', intervention: 'strengthen' },
  nordic: { target: 'hamstring', targetType: 'muscle', intervention: 'strengthen' },
  calf: { target: 'calf', targetType: 'muscle', intervention: 'strengthen' },
  heel_raise: { target: 'calf', targetType: 'muscle', intervention: 'strengthen' },
  scapula: { target: 'scapula', targetType: 'muscle', intervention: 'strengthen' },
  row: { target: 'scapula', targetType: 'muscle', intervention: 'strengthen' },
  retraction: { target: 'scapula', targetType: 'muscle', intervention: 'strengthen' },
  rotator_cuff: { target: 'rotator_cuff', targetType: 'muscle', intervention: 'strengthen' },
  external_rotation: { target: 'rotator_cuff', targetType: 'muscle', intervention: 'strengthen' },
  internal_rotation: { target: 'rotator_cuff', targetType: 'muscle', intervention: 'strengthen' },
  shoulder: { target: 'rotator_cuff', targetType: 'muscle', intervention: 'strengthen' },
  deltoid: { target: 'deltoid', targetType: 'muscle', intervention: 'strengthen' },
  neck: { target: 'neck', targetType: 'muscle', intervention: 'strengthen' },
  chin_tuck: { target: 'neck', targetType: 'muscle', intervention: 'strengthen' },
  deep_neck: { target: 'neck', targetType: 'muscle', intervention: 'strengthen' },
  spine: { target: 'spine', targetType: 'muscle', intervention: 'strengthen' },
  extension: { target: 'spine', targetType: 'muscle', intervention: 'strengthen' },
  chest: { target: 'chest', targetType: 'muscle', intervention: 'stretch' },
  pec: { target: 'chest', targetType: 'muscle', intervention: 'stretch' },
  hip_flexor: { target: 'hip_flexor', targetType: 'muscle', intervention: 'stretch' },
  psoas: { target: 'hip_flexor', targetType: 'muscle', intervention: 'stretch' },
  thomas: { target: 'hip_flexor', targetType: 'muscle', intervention: 'stretch' },
  piriformis: { target: 'piriformis', targetType: 'muscle', intervention: 'stretch' },
  adductor: { target: 'adductor', targetType: 'muscle', intervention: 'stretch' },
  ankle_mob: { target: 'ankle', targetType: 'joint', intervention: 'mobilize' },
  dorsiflexion: { target: 'ankle', targetType: 'joint', intervention: 'mobilize' },
  hip_mob: { target: 'hip', targetType: 'joint', intervention: 'mobilize' },
  spine_mob: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  thoracic_mob: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  cat_cow: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  shoulder_mob: { target: 'shoulder', targetType: 'joint', intervention: 'mobilize' },
  knee_mob: { target: 'knee', targetType: 'joint', intervention: 'mobilize' },
  wrist: { target: 'wrist', targetType: 'joint', intervention: 'mobilize' },
  elbow: { target: 'elbow', targetType: 'joint', intervention: 'mobilize' },
  stretch: { target: 'hip_flexor', targetType: 'muscle', intervention: 'stretch' },
  mobiliz: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  mobilise: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  foam_roll: { target: 'quad', targetType: 'muscle', intervention: 'stretch' },
  release: { target: 'hip_flexor', targetType: 'muscle', intervention: 'stretch' },
  myofascial: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  traction: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  manipulation: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  soft_tissue: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  trigger_point: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  massage: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  dry_needling: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  joint_mob: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  maitland: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  mulligan: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  mwm: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
};

const REGION_TARGET_MAP: Record<string, { target: string; targetType: 'muscle' | 'joint'; intervention: InterventionType }> = {
  lumbar: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  thoracic: { target: 'spine', targetType: 'joint', intervention: 'mobilize' },
  cervical: { target: 'neck', targetType: 'joint', intervention: 'mobilize' },
  shoulder: { target: 'rotator_cuff', targetType: 'muscle', intervention: 'strengthen' },
  hip: { target: 'glute', targetType: 'muscle', intervention: 'strengthen' },
  knee: { target: 'quad', targetType: 'muscle', intervention: 'strengthen' },
  ankle: { target: 'ankle', targetType: 'joint', intervention: 'mobilize' },
  elbow: { target: 'elbow', targetType: 'joint', intervention: 'mobilize' },
  wrist: { target: 'wrist', targetType: 'joint', intervention: 'mobilize' },
  core: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  gluteal: { target: 'glute', targetType: 'muscle', intervention: 'strengthen' },
  hamstring: { target: 'hamstring', targetType: 'muscle', intervention: 'strengthen' },
  calf: { target: 'calf', targetType: 'muscle', intervention: 'strengthen' },
  scapular: { target: 'scapula', targetType: 'muscle', intervention: 'strengthen' },
  pelvis: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  sacroiliac: { target: 'core', targetType: 'muscle', intervention: 'strengthen' },
  quadriceps: { target: 'quad', targetType: 'muscle', intervention: 'strengthen' },
};

function classifyExercise(
  exercise: PlanExercise,
  isManualTherapy: boolean
): { target: string; targetType: 'muscle' | 'joint'; intervention: InterventionType } {
  const nameLower = exercise.name.toLowerCase().replace(/[-\s]+/g, '_');
  const categoryLower = exercise.category?.toLowerCase() || '';

  if (isManualTherapy) {
    for (const region of exercise.targetRegions || []) {
      const regionLower = region.toLowerCase();
      for (const [key, mapping] of Object.entries(REGION_TARGET_MAP)) {
        if (regionLower.includes(key)) {
          return { ...mapping, intervention: 'mobilize' };
        }
      }
    }
    for (const [keyword, mapping] of Object.entries(EXERCISE_NAME_TO_TARGET)) {
      if (nameLower.includes(keyword)) {
        return { ...mapping, intervention: mapping.intervention === 'strengthen' ? 'mobilize' : mapping.intervention };
      }
    }
    return { target: 'spine', targetType: 'joint', intervention: 'mobilize' };
  }

  for (const [keyword, mapping] of Object.entries(EXERCISE_NAME_TO_TARGET)) {
    if (nameLower.includes(keyword)) {
      return mapping;
    }
  }

  for (const region of exercise.targetRegions || []) {
    const regionLower = region.toLowerCase();
    for (const [key, mapping] of Object.entries(REGION_TARGET_MAP)) {
      if (regionLower.includes(key)) {
        return mapping;
      }
    }
  }

  if (categoryLower.includes('stretch') || categoryLower.includes('flexibility')) {
    return { target: 'hip_flexor', targetType: 'muscle', intervention: 'stretch' };
  }
  if (categoryLower.includes('mobil')) {
    return { target: 'spine', targetType: 'joint', intervention: 'mobilize' };
  }

  return { target: 'core', targetType: 'muscle', intervention: 'strengthen' };
}

function parseDurationWeeks(durationStr: string): number {
  const cleaned = durationStr.replace(/weeks?/gi, '').trim();
  const rangeMatch = cleaned.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1]);
    const b = parseInt(rangeMatch[2]);
    return b > a ? b - a : b;
  }
  const numMatch = cleaned.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }
  return 4;
}

function computePhaseWeekRanges(phases: PlanPhase[]): Array<{ phase: PlanPhase; startWeek: number; endWeek: number }> {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  const result: Array<{ phase: PlanPhase; startWeek: number; endWeek: number }> = [];
  let currentWeek = 0;

  for (const phase of sorted) {
    const phaseLength = parseDurationWeeks(phase.durationWeeks);
    result.push({
      phase,
      startWeek: currentWeek,
      endWeek: currentWeek + phaseLength,
    });
    currentWeek += phaseLength;
  }

  return result;
}

function exerciseToDoseScale(exercise: PlanExercise, phaseOrder: number, totalPhases: number): number {
  const phaseProgression = totalPhases > 1 ? 0.5 + (phaseOrder / (totalPhases - 1)) * 0.5 : 0.75;
  const setsMultiplier = Math.min(exercise.sets / 3, 1.5);
  const intensityFactor = exercise.intensity?.toLowerCase().includes('high') ? 1.2
    : exercise.intensity?.toLowerCase().includes('mod') ? 1.0
    : 0.7;
  return Math.min(phaseProgression * setsMultiplier * intensityFactor, 2.0);
}

function getDoseResponseFraction(week: number): number {
  if (week === 0) return 0;
  if (week <= 2) return 0.15 * week;
  if (week <= 6) return 0.3 + (week - 2) * 0.12;
  if (week <= 10) return 0.78 + (week - 6) * 0.04;
  return Math.min(0.94 + (week - 10) * 0.015, 1);
}

function getRiskLevelFromScore(score: number): string {
  if (score < 20) return 'minimal';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'critical';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function buildSimulationTimeline(
  treatmentPlan: TreatmentPlanResult,
  baseModelConfig: Record<string, any>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  painMarkers: Array<{ id: string; position: { x: number; y: number; z: number }; label: string; type: 'point' | 'area' | 'referred' | 'line' | 'paint'; severity?: number; description?: string }>,
  bodyWeightKg: number,
  biomechanicsOutput?: any | null,
  patientModifiers?: PatientModifierProfile | null,
  conditionProfile?: ConditionRecoveryProfile | null,
): SimulationTimelineResult {
  const pm = patientModifiers ?? null;
  const cp = conditionProfile ?? null;
  const phaseRanges = computePhaseWeekRanges(treatmentPlan.phases);
  const rawDuration = phaseRanges.length > 0 ? phaseRanges[phaseRanges.length - 1].endWeek : 12;
  const phaseTimingScale = pm ? pm.phaseTimingMultiplier : 1;
  const totalDuration = Math.round(rawDuration * phaseTimingScale);
  const totalPhases = treatmentPlan.phases.length;

  const simPhases: SimulationPhase[] = phaseRanges.map(({ phase, startWeek, endWeek }) => {
    const scaledStart = Math.round(startWeek * phaseTimingScale);
    const scaledEnd = Math.round(endWeek * phaseTimingScale);
    const exercises: PhaseExerciseEntry[] = phase.exercises.map(ex => {
      const classification = classifyExercise(ex, false);
      return {
        name: ex.name,
        category: ex.category,
        sets: ex.sets,
        reps: ex.reps,
        intensity: ex.intensity,
        targetRegions: ex.targetRegions,
        interventionType: classification.intervention,
        target: classification.target,
        targetType: classification.targetType,
        magnitude: classification.intervention === 'mobilize' ? 10 : 15,
        doseScale: exerciseToDoseScale(ex, phase.order, totalPhases),
      };
    });

    const manualTherapy: PhaseExerciseEntry[] = phase.manualTherapy.map(mt => {
      const classification = classifyExercise(mt, true);
      return {
        name: mt.name,
        category: mt.category,
        sets: mt.sets,
        reps: mt.reps,
        intensity: mt.intensity,
        targetRegions: mt.targetRegions,
        interventionType: classification.intervention,
        target: classification.target,
        targetType: classification.targetType,
        magnitude: classification.intervention === 'mobilize' ? 12 : 10,
        doseScale: exerciseToDoseScale(mt, phase.order, totalPhases),
      };
    });

    return {
      id: phase.id,
      name: phase.name,
      order: phase.order,
      startWeek: scaledStart,
      endWeek: scaledEnd,
      goals: phase.goals,
      activeExercises: exercises,
      activeManualTherapy: manualTherapy,
      advancementCriteria: phase.reviewPoint || `Complete ${scaledEnd - scaledStart} weeks of phase`,
      frequency: phase.frequency,
    };
  });

  const baseMuscles = computeFullMuscleAnalysis(baseModelConfig);
  const appliedMuscles = applyOverridesToAnalysis(baseMuscles, baseOverrides as Record<string, MuscleOverride>);

  let startingRisk = 50;
  let startingSlingIntegrity = 50;
  try {
    const baseComparison = computeWhatIfComparison(
      baseModelConfig, baseOverrides, painMarkers, bodyWeightKg,
      [{ id: '__noop', label: '', description: '', interventionType: 'offload', target: 'cadence', targetType: 'joint', magnitude: 0, unit: '%', color: '#000' }],
      appliedMuscles, biomechanicsOutput
    );
    startingRisk = baseComparison.overallRiskBefore;
    startingSlingIntegrity = baseComparison.forceTransferScoreBefore;
  } catch (e) {
    console.warn('[SimTimeline] Baseline risk computation failed, using defaults:', e instanceof Error ? e.message : String(e));
  }

  const weekSnapshots: WeekSnapshot[] = [];
  const milestones: SimulationMilestone[] = [];
  let prevRisk = startingRisk;
  let prevPhaseId = '';
  const errors: string[] = [];

  for (let week = 0; week <= totalDuration; week++) {
    const activePhase = simPhases.find(p => week >= p.startWeek && week < p.endWeek)
      || simPhases[simPhases.length - 1];

    if (activePhase.id !== prevPhaseId && week > 0) {
      const prevPhase = simPhases.find(p => p.id === prevPhaseId);
      milestones.push({
        week,
        label: `Phase transition: ${activePhase.name}`,
        criteria: prevPhase?.advancementCriteria || '',
        type: 'phase_transition',
      });
    }
    prevPhaseId = activePhase.id;

    const rawDoseResponse = getDoseResponseFraction(week);
    const doseResponse = pm ? rawDoseResponse * pm.perSessionDoseScale : rawDoseResponse;

    let conditionPhaseRomCeiling = 1.0;
    let conditionTreatmentResponsiveness: Record<string, number> = {};
    if (cp && cp.phases.length > 0) {
      const cpPhaseIdx = cp.phases.findIndex((_, i) => {
        const phaseFraction = (i + 1) / cp.phases.length;
        const weekFraction = totalDuration > 0 ? week / totalDuration : 0;
        return weekFraction <= phaseFraction;
      });
      const cpPhase = cp.phases[cpPhaseIdx >= 0 ? cpPhaseIdx : cp.phases.length - 1];
      conditionPhaseRomCeiling = cpPhase.romCeilingPercent / 100;
      conditionTreatmentResponsiveness = cpPhase.treatmentResponsiveness;
    }

    const scenarios: WhatIfScenario[] = [];
    const seen = new Set<string>();
    const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6', '#10b981', '#ef4444'];
    let colorIdx = 0;

    const completedPhases = simPhases.filter(p => p.endWeek <= week);
    const priorEntries: PhaseExerciseEntry[] = [];
    for (const cp of completedPhases) {
      priorEntries.push(...cp.activeExercises, ...cp.activeManualTherapy);
    }

    const currentEntries = [...activePhase.activeExercises, ...activePhase.activeManualTherapy];
    const allCumulativeEntries = [...priorEntries, ...currentEntries];

    for (const entry of allCumulativeEntries) {
      const key = `${entry.target}_${entry.interventionType}`;
      if (seen.has(key)) {
        const existing = scenarios.find(s => s.id.startsWith(`sim_${key}_`));
        if (existing) {
          const addMag = entry.magnitude * doseResponse * entry.doseScale;
          existing.magnitude = Math.min(existing.magnitude + addMag * 0.3, existing.magnitude * 1.5);
        }
        continue;
      }
      seen.add(key);

      let conditionResponsiveFactor = 1.0;
      if (Object.keys(conditionTreatmentResponsiveness).length > 0) {
        const entryKey = entry.interventionType.toLowerCase();
        const entryName = entry.name.toLowerCase().replace(/[-\s]+/g, '_');
        for (const [trKey, trVal] of Object.entries(conditionTreatmentResponsiveness)) {
          const trKeyLower = trKey.toLowerCase();
          if (entryKey.includes(trKeyLower) || entryName.includes(trKeyLower) || trKeyLower.includes(entryKey)) {
            conditionResponsiveFactor = trVal;
            break;
          }
        }
      }
      const scaledMagnitude = entry.magnitude * doseResponse * entry.doseScale * conditionResponsiveFactor;
      if (scaledMagnitude < 0.5) continue;

      scenarios.push({
        id: `sim_${key}_w${week}`,
        label: entry.name.length > 20 ? entry.name.slice(0, 17) + '...' : entry.name,
        description: `${entry.interventionType} ${entry.target} (week ${week})`,
        interventionType: entry.interventionType,
        target: entry.target,
        targetType: entry.targetType,
        magnitude: scaledMagnitude,
        unit: entry.interventionType === 'mobilize' ? '°' : '%',
        color: colors[colorIdx++ % colors.length],
      });
    }

    if (week === 0 || scenarios.length === 0) {
      weekSnapshots.push({
        week,
        phaseId: activePhase.id,
        phaseName: activePhase.name,
        riskScore: Math.round(startingRisk),
        riskLevel: getRiskLevelFromScore(startingRisk),
        painPrediction: startingRisk * 0.8,
        forceReduction: 0,
        compensationResolution: 0,
        slingIntegrity: startingSlingIntegrity,
        doseResponseFraction: week === 0 ? 0 : doseResponse,
        activeScenarios: scenarios,
        modelConfig: JSON.parse(JSON.stringify(baseModelConfig)),
        overrides: JSON.parse(JSON.stringify(baseOverrides)),
        forceMultiplier: 1.0,
      });
      continue;
    }

    const { modelConfig: weekConfig, overrides: weekOverrides, forceMultiplier } = applyScenarios(
      baseModelConfig, baseOverrides, scenarios, appliedMuscles
    );

    let weekRisk = startingRisk;
    let weekSling = startingSlingIntegrity;
    let weekPain = startingRisk * 0.8;
    let comparisonSucceeded = false;
    try {
      const weekComparison = computeWhatIfComparison(
        baseModelConfig, baseOverrides, painMarkers, bodyWeightKg,
        scenarios, appliedMuscles, biomechanicsOutput
      );
      weekRisk = weekComparison.overallRiskAfter;
      weekSling = weekComparison.forceTransferScoreAfter;
      const avgPainDelta = weekComparison.painPredictions.length > 0
        ? weekComparison.painPredictions.reduce((s, p) => s + p.afterLikelihood, 0) / weekComparison.painPredictions.length
        : weekRisk * 0.7;
      weekPain = avgPainDelta;
      comparisonSucceeded = true;
    } catch (e) {
      const msg = `[SimTimeline] Week ${week} comparison failed: ${e instanceof Error ? e.message : String(e)}`;
      console.warn(msg);
      errors.push(msg);
    }

    if (!comparisonSucceeded) {
      const prevSnapshot = weekSnapshots[weekSnapshots.length - 1];
      if (prevSnapshot) {
        weekRisk = prevSnapshot.riskScore;
        weekSling = prevSnapshot.slingIntegrity;
        weekPain = prevSnapshot.painPrediction;
      }
    }

    if (pm) {
      const interSessionBoost = pm.interSessionHealingMultiplier;
      const healingBoost = (1 - pm.healingRateMultiplier) * week * 0.5;
      weekRisk = clamp(weekRisk + healingBoost, 0, 100);
      weekPain = clamp(weekPain * pm.painSensitivityMultiplier, 0, 100);
      const romCap = pm.romCeilingAdjustment * conditionPhaseRomCeiling;
      weekSling = clamp(weekSling * romCap, 0, 100);
      const recoveryDelta = (interSessionBoost - 1) * week * 0.3;
      weekRisk = clamp(weekRisk - recoveryDelta, 0, 100);
    } else if (cp) {
      weekSling = clamp(weekSling * conditionPhaseRomCeiling, 0, 100);
    }

    const forceReduction = (1 - forceMultiplier) * 100;
    const compensationResolution = doseResponse * 60;

    if (weekRisk < prevRisk - 10) {
      const riskLevel = getRiskLevelFromScore(weekRisk);
      const prevLevel = getRiskLevelFromScore(prevRisk);
      if (riskLevel !== prevLevel) {
        milestones.push({
          week,
          label: `Risk reduced to ${riskLevel} (${Math.round(weekRisk)})`,
          type: 'risk_reduction',
        });
      }
    }

    if (weekSling > startingSlingIntegrity + 15 && !milestones.some(m => m.type === 'sling_improvement')) {
      milestones.push({
        week,
        label: `Sling integrity improved to ${Math.round(weekSling)}%`,
        type: 'sling_improvement',
      });
    }

    if (weekPain < startingRisk * 0.4 && !milestones.some(m => m.type === 'pain_milestone')) {
      milestones.push({
        week,
        label: `Significant pain reduction predicted`,
        type: 'pain_milestone',
      });
    }

    prevRisk = weekRisk;

    weekSnapshots.push({
      week,
      phaseId: activePhase.id,
      phaseName: activePhase.name,
      riskScore: Math.round(clamp(weekRisk, 0, 100)),
      riskLevel: getRiskLevelFromScore(weekRisk),
      painPrediction: Math.round(clamp(weekPain, 0, 100)),
      forceReduction: Math.round(forceReduction * 10) / 10,
      compensationResolution: Math.round(compensationResolution * 10) / 10,
      slingIntegrity: Math.round(clamp(weekSling, 0, 100)),
      doseResponseFraction: doseResponse,
      activeScenarios: scenarios,
      modelConfig: weekConfig,
      overrides: weekOverrides,
      forceMultiplier,
    });
  }

  if (errors.length > 0) {
    console.warn(`[SimTimeline] ${errors.length} week(s) failed simulation; used fallback values`);
  }

  const lastSnapshot = weekSnapshots[weekSnapshots.length - 1];
  const estimatedRecoveryWeeks = (() => {
    const targetRisk = 25;
    for (const snap of weekSnapshots) {
      if (snap.riskScore <= targetRisk) return snap.week;
    }
    return totalDuration;
  })();

  return {
    phases: simPhases,
    weekSnapshots,
    totalDurationWeeks: totalDuration,
    startingState: {
      riskScore: Math.round(startingRisk),
      riskLevel: getRiskLevelFromScore(startingRisk),
      slingIntegrity: Math.round(startingSlingIntegrity),
      painBaseline: Math.round(startingRisk * 0.8),
    },
    endState: {
      riskScore: lastSnapshot?.riskScore ?? Math.round(startingRisk),
      riskLevel: lastSnapshot?.riskLevel ?? getRiskLevelFromScore(startingRisk),
      slingIntegrity: lastSnapshot?.slingIntegrity ?? Math.round(startingSlingIntegrity),
      estimatedRecoveryWeeks,
    },
    milestones: milestones.sort((a, b) => a.week - b.week),
  };
}

export interface SessionTreatment {
  name: string;
  type: 'exercise' | 'manual_therapy';
  targetStructure: string;
  interventionType: InterventionType;
  target: string;
  targetType: 'muscle' | 'joint';
  magnitude: number;
  dosageLabel: string;
  frequency: string;
}

export interface SessionModification {
  sessionNumber: number;
  type: 'progress' | 'plateau' | 'regress';
  message: string;
  suggestion: string;
}

export interface RomPrediction {
  jointId: string;
  jointLabel: string;
  plane: string;
  currentDegrees: number;
  targetDegrees: number;
  predictedDegrees: number;
  deltaFromBaseline: number;
  limitingFactor: string;
}

export interface PainMarkerPrediction {
  markerId: string;
  markerLabel: string;
  baselineSeverity: number;
  predictedSeverity: number;
  deltaFromBaseline: number;
  mechanism: string;
}

export interface MuscleStatePrediction {
  muscleId: string;
  muscleLabel: string;
  baselineTension: number;
  predictedTension: number;
  baselineActivation: number;
  predictedActivation: number;
  trendDirection: 'improving' | 'stable' | 'worsening';
  clinicalNote: string;
}

export interface SlingPrediction {
  slingId: string;
  slingName: string;
  baselineIntegrity: number;
  predictedIntegrity: number;
  deltaFromBaseline: number;
  weakLinks: string[];
}

export interface PosturalPrediction {
  sliderId: string;
  sliderLabel: string;
  baselineValue: number;
  predictedValue: number;
  normalValue: number;
  correctionPercent: number;
}

export interface CompensationPrediction {
  patternId: string;
  patternLabel: string;
  baselineSeverity: number;
  predictedSeverity: number;
  resolutionPercent: number;
  contributingFactors: string[];
}

export interface FunctionalMilestone {
  id: string;
  label: string;
  description: string;
  triggeredAtSession: number | null;
  thresholdType: 'rom' | 'pain' | 'strength' | 'function' | 'sling';
  thresholdValue: number;
  currentValue: number;
  achieved: boolean;
}

export interface InterSessionHealing {
  tissueRemodeling: number;
  exerciseCarryOver: number;
  inflammationResolution: number;
  netHealingDelta: number;
}

export interface SessionSnapshot {
  sessionNumber: number;
  dayOffset: number;
  treatments: SessionTreatment[];
  riskScore: number;
  riskLevel: string;
  painPrediction: number;
  slingIntegrity: number;
  forceReduction: number;
  compensationResolution: number;
  doseResponseFraction: number;
  activeScenarios: WhatIfScenario[];
  modelConfig: Record<string, Record<string, number>>;
  overrides: Record<string, Partial<MuscleOverride>>;
  forceMultiplier: number;
  romPredictions: RomPrediction[];
  painMarkerPredictions: PainMarkerPrediction[];
  muscleStatePredictions: MuscleStatePrediction[];
  slingPredictions: SlingPrediction[];
  posturalPredictions: PosturalPrediction[];
  compensationPredictions: CompensationPrediction[];
  functionalMilestones: FunctionalMilestone[];
  interSessionHealing: InterSessionHealing | null;
  recoveryPhaseLabel: string;
  isPlateauSession: boolean;
  isBreakthroughSession: boolean;
  isSetbackSession: boolean;
}

export interface SessionApplyPayload {
  modelConfig: Record<string, Record<string, number>>;
  overrides: Record<string, Partial<MuscleOverride>>;
  painMarkerUpdates: Array<{ markerId: string; predictedSeverity: number }>;
  posturalUpdates: Array<{ sliderId: string; predictedValue: number }>;
  compensationUpdates: Array<{ patternId: string; predictedSeverity: number; resolutionPercent: number }>;
}

export interface ActualSessionOutcome {
  sessionNumber: number;
  actualRom?: Record<string, number>;
  actualPain?: Record<string, number>;
  actualMuscleTension?: Record<string, number>;
  complianceRating?: number;
  notes?: string;
}

export interface DimensionCorrectionFactor {
  dimension: string;
  label: string;
  correctionMultiplier: number;
  trend: 'faster' | 'slower' | 'as_expected';
  magnitude: number;
  sessionCount: number;
}

export interface CorrectionFactors {
  rom: Record<string, DimensionCorrectionFactor>;
  pain: Record<string, DimensionCorrectionFactor>;
  muscle: Record<string, DimensionCorrectionFactor>;
  overall: DimensionCorrectionFactor;
  compliance: number;
}

function computeEWMACorrectionFactors(
  sessions: SessionSnapshot[],
  outcomes: ActualSessionOutcome[],
  alpha: number = 0.4,
): CorrectionFactors {
  const romFactors: Record<string, { sumWeighted: number; sumWeights: number; count: number }> = {};
  const painFactors: Record<string, { sumWeighted: number; sumWeights: number; count: number }> = {};
  const muscleFactors: Record<string, { sumWeighted: number; sumWeights: number; count: number }> = {};
  let overallSum = 0;
  let overallWeightSum = 0;
  let overallCount = 0;
  let complianceSum = 0;
  let complianceCount = 0;

  const sortedOutcomes = [...outcomes].sort((a, b) => a.sessionNumber - b.sessionNumber);

  for (let i = 0; i < sortedOutcomes.length; i++) {
    const oc = sortedOutcomes[i];
    const snap = sessions.find(s => s.sessionNumber === oc.sessionNumber);
    if (!snap) continue;

    const recency = Math.pow(1 - alpha, sortedOutcomes.length - 1 - i);

    if (oc.actualRom) {
      for (const [jointId, actualDeg] of Object.entries(oc.actualRom)) {
        const pred = snap.romPredictions.find(r => r.jointId === jointId);
        if (pred && pred.predictedDegrees > 0) {
          const ratio = actualDeg / pred.predictedDegrees;
          if (!romFactors[jointId]) romFactors[jointId] = { sumWeighted: 0, sumWeights: 0, count: 0 };
          romFactors[jointId].sumWeighted += ratio * recency;
          romFactors[jointId].sumWeights += recency;
          romFactors[jointId].count++;
          overallSum += ratio * recency;
          overallWeightSum += recency;
          overallCount++;
        }
      }
    }

    if (oc.actualPain) {
      for (const [markerId, actualPain] of Object.entries(oc.actualPain)) {
        const pred = snap.painMarkerPredictions.find(p => p.markerId === markerId);
        if (pred && pred.predictedSeverity > 0) {
          const ratio = pred.predictedSeverity / actualPain;
          const safeRatio = actualPain > 0 ? ratio : (pred.predictedSeverity > actualPain ? 2.0 : 1.0);
          if (!painFactors[markerId]) painFactors[markerId] = { sumWeighted: 0, sumWeights: 0, count: 0 };
          painFactors[markerId].sumWeighted += safeRatio * recency;
          painFactors[markerId].sumWeights += recency;
          painFactors[markerId].count++;
          overallSum += safeRatio * recency;
          overallWeightSum += recency;
          overallCount++;
        }
      }
    }

    if (oc.actualMuscleTension) {
      for (const [muscleId, actualT] of Object.entries(oc.actualMuscleTension)) {
        const pred = snap.muscleStatePredictions.find(m => m.muscleId === muscleId);
        if (pred && pred.predictedTension > 0) {
          const actualDist = Math.abs(actualT - 50);
          const predDist = Math.abs(pred.predictedTension - 50);
          const ratio = predDist > 0 ? (predDist - actualDist) / predDist + 1 : 1;
          const safeRatio = clamp(ratio, 0.5, 2.0);
          if (!muscleFactors[muscleId]) muscleFactors[muscleId] = { sumWeighted: 0, sumWeights: 0, count: 0 };
          muscleFactors[muscleId].sumWeighted += safeRatio * recency;
          muscleFactors[muscleId].sumWeights += recency;
          muscleFactors[muscleId].count++;
          overallSum += safeRatio * recency;
          overallWeightSum += recency;
          overallCount++;
        }
      }
    }

    if (oc.complianceRating !== undefined) {
      complianceSum += oc.complianceRating;
      complianceCount++;
    }
  }

  const buildFactor = (dim: string, label: string, data: { sumWeighted: number; sumWeights: number; count: number }): DimensionCorrectionFactor => {
    const corr = data.sumWeights > 0 ? data.sumWeighted / data.sumWeights : 1;
    const clamped = clamp(corr, 0.5, 2.0);
    const magnitude = Math.abs(clamped - 1) * 100;
    const trend: 'faster' | 'slower' | 'as_expected' = clamped > 1.05 ? 'faster' : clamped < 0.95 ? 'slower' : 'as_expected';
    return { dimension: dim, label, correctionMultiplier: clamped, trend, magnitude: Math.round(magnitude), sessionCount: data.count };
  };

  const romResult: Record<string, DimensionCorrectionFactor> = {};
  for (const [jId, data] of Object.entries(romFactors)) {
    romResult[jId] = buildFactor('rom', jId, data);
  }

  const painResult: Record<string, DimensionCorrectionFactor> = {};
  for (const [mId, data] of Object.entries(painFactors)) {
    painResult[mId] = buildFactor('pain', mId, data);
  }

  const muscleResult: Record<string, DimensionCorrectionFactor> = {};
  for (const [mId, data] of Object.entries(muscleFactors)) {
    muscleResult[mId] = buildFactor('muscle', mId, data);
  }

  const overallCorr = overallWeightSum > 0 ? overallSum / overallWeightSum : 1;
  const overallClamped = clamp(overallCorr, 0.5, 2.0);
  const overallMag = Math.abs(overallClamped - 1) * 100;
  const overallTrend: 'faster' | 'slower' | 'as_expected' = overallClamped > 1.05 ? 'faster' : overallClamped < 0.95 ? 'slower' : 'as_expected';

  return {
    rom: romResult,
    pain: painResult,
    muscle: muscleResult,
    overall: {
      dimension: 'overall',
      label: 'Overall',
      correctionMultiplier: overallClamped,
      trend: overallTrend,
      magnitude: Math.round(overallMag),
      sessionCount: overallCount,
    },
    compliance: complianceCount > 0 ? complianceSum / complianceCount : 1,
  };
}

export { computeEWMACorrectionFactors };

export interface MultiDimensionalBaseline {
  romBaselines: RomPrediction[];
  painBaselines: PainMarkerPrediction[];
  muscleBaselines: MuscleStatePrediction[];
  slingBaselines: SlingPrediction[];
  posturalBaselines: PosturalPrediction[];
  compensationBaselines: CompensationPrediction[];
}

export interface TreatmentPhaseBlock {
  phaseLabel: string;
  phaseIndex: number;
  startSession: number;
  endSession: number;
  exercises: CustomExercise[];
  techniques: CustomTechnique[];
  designRationale: string;
  safetyNotes: string;
  predictedStateAtTransition: {
    avgPain: number;
    avgRomPercent: number;
    avgSlingIntegrity: number;
    avgCompensationResolution: number;
    riskScore: number;
    achievedMilestones: string[];
    correctionTrend?: 'faster' | 'slower' | 'as_expected';
  } | null;
  phaseGoals: string;
  previousProgressionStages: Array<{ exerciseName: string; stages: Array<{ stage: number; name: string; description: string }> }>;
}

export interface PhaseProgressEvent {
  phaseIndex: number;
  phaseLabel: string;
  status: 'building' | 'requerying' | 'complete';
  message: string;
}

export interface SessionTimelineResult {
  sessions: SessionSnapshot[];
  totalSessions: number;
  totalDays: number;
  sessionIntervalDays: number;
  treatments: SessionTreatment[];
  modifications: SessionModification[];
  baseline: MultiDimensionalBaseline;
  startingState: {
    riskScore: number;
    riskLevel: string;
    slingIntegrity: number;
    painBaseline: number;
  };
  endState: {
    riskScore: number;
    riskLevel: string;
    slingIntegrity: number;
    estimatedRecoverySessions: number;
  };
  milestones: SimulationMilestone[];
  functionalMilestones: FunctionalMilestone[];
  correctionFactors?: CorrectionFactors;
  actualOutcomes?: ActualSessionOutcome[];
  treatmentPhases?: TreatmentPhaseBlock[];
}

const JOINT_ROM_NORMS: Record<string, { label: string; plane: string; normalDegrees: number }> = {
  shoulder_flexion: { label: 'Shoulder Flexion', plane: 'sagittal', normalDegrees: 180 },
  shoulder_abduction: { label: 'Shoulder Abduction', plane: 'frontal', normalDegrees: 180 },
  shoulder_er: { label: 'Shoulder External Rotation', plane: 'transverse', normalDegrees: 90 },
  shoulder_ir: { label: 'Shoulder Internal Rotation', plane: 'transverse', normalDegrees: 70 },
  elbow_flexion: { label: 'Elbow Flexion', plane: 'sagittal', normalDegrees: 150 },
  hip_flexion: { label: 'Hip Flexion', plane: 'sagittal', normalDegrees: 120 },
  hip_abduction: { label: 'Hip Abduction', plane: 'frontal', normalDegrees: 45 },
  hip_er: { label: 'Hip External Rotation', plane: 'transverse', normalDegrees: 45 },
  hip_ir: { label: 'Hip Internal Rotation', plane: 'transverse', normalDegrees: 35 },
  knee_flexion: { label: 'Knee Flexion', plane: 'sagittal', normalDegrees: 140 },
  knee_extension: { label: 'Knee Extension', plane: 'sagittal', normalDegrees: 0 },
  ankle_dorsiflexion: { label: 'Ankle Dorsiflexion', plane: 'sagittal', normalDegrees: 20 },
  ankle_plantarflexion: { label: 'Ankle Plantarflexion', plane: 'sagittal', normalDegrees: 50 },
  cervical_flexion: { label: 'Cervical Flexion', plane: 'sagittal', normalDegrees: 50 },
  cervical_rotation: { label: 'Cervical Rotation', plane: 'transverse', normalDegrees: 80 },
  lumbar_flexion: { label: 'Lumbar Flexion', plane: 'sagittal', normalDegrees: 60 },
  lumbar_extension: { label: 'Lumbar Extension', plane: 'sagittal', normalDegrees: 25 },
  thoracic_rotation: { label: 'Thoracic Rotation', plane: 'transverse', normalDegrees: 40 },
};

const TARGET_TO_JOINTS: Record<string, string[]> = {
  rotator_cuff: ['shoulder_flexion', 'shoulder_abduction', 'shoulder_er', 'shoulder_ir'],
  deltoid: ['shoulder_flexion', 'shoulder_abduction'],
  scapula: ['shoulder_flexion', 'shoulder_abduction'],
  glute: ['hip_flexion', 'hip_abduction', 'hip_er', 'hip_ir'],
  hip_flexor: ['hip_flexion', 'hip_er'],
  piriformis: ['hip_er', 'hip_ir'],
  quad: ['knee_flexion', 'hip_flexion'],
  hamstring: ['knee_flexion', 'hip_flexion'],
  adductor: ['hip_abduction'],
  calf: ['ankle_dorsiflexion', 'ankle_plantarflexion'],
  ankle: ['ankle_dorsiflexion', 'ankle_plantarflexion'],
  core: ['lumbar_flexion', 'lumbar_extension'],
  spine: ['lumbar_flexion', 'lumbar_extension', 'thoracic_rotation'],
  neck: ['cervical_flexion', 'cervical_rotation'],
  shoulder: ['shoulder_flexion', 'shoulder_abduction', 'shoulder_er'],
  hip: ['hip_flexion', 'hip_abduction', 'hip_er'],
  knee: ['knee_flexion', 'knee_extension'],
  elbow: ['elbow_flexion'],
  wrist: [],
};

const SLING_DEFINITIONS: Array<{ id: string; name: string; muscles: string[] }> = [
  { id: 'posterior_oblique', name: 'Posterior Oblique Sling', muscles: ['scapula', 'spine', 'glute', 'hamstring'] },
  { id: 'anterior_oblique', name: 'Anterior Oblique Sling', muscles: ['deltoid', 'chest', 'core', 'adductor'] },
  { id: 'lateral', name: 'Lateral Sling', muscles: ['glute', 'core', 'quad'] },
  { id: 'deep_longitudinal', name: 'Deep Longitudinal Sling', muscles: ['calf', 'hamstring', 'spine', 'glute'] },
  { id: 'scapular_shoulder', name: 'Scapular/Shoulder Sling', muscles: ['scapula', 'rotator_cuff', 'deltoid', 'chest'] },
];

const POSTURE_SLIDER_NORMS: Record<string, { label: string; normalValue: number }> = {
  headForward: { label: 'Head Forward', normalValue: 0 },
  headTilt: { label: 'Head Tilt', normalValue: 0 },
  shoulderProtraction: { label: 'Shoulder Protraction', normalValue: 0 },
  shoulderElevation: { label: 'Shoulder Elevation', normalValue: 0 },
  thoracicKyphosis: { label: 'Thoracic Kyphosis', normalValue: 0 },
  lumbarLordosis: { label: 'Lumbar Lordosis', normalValue: 0 },
  pelvicTilt: { label: 'Pelvic Tilt', normalValue: 0 },
  trunkShift: { label: 'Trunk Shift', normalValue: 0 },
  kneeValgus: { label: 'Knee Valgus', normalValue: 0 },
};

const FUNCTIONAL_MILESTONE_TEMPLATES: Array<{
  id: string; label: string; description: string;
  thresholdType: FunctionalMilestone['thresholdType']; thresholdValue: number;
  relatedJoints: string[]; relatedTargets: string[];
}> = [
  { id: 'fm_seatbelt', label: 'Can fasten seatbelt', description: 'Shoulder external rotation reaches 45°', thresholdType: 'rom', thresholdValue: 45, relatedJoints: ['shoulder_er'], relatedTargets: ['rotator_cuff', 'shoulder'] },
  { id: 'fm_overhead', label: 'Overhead reach restored', description: 'Shoulder flexion reaches 160°', thresholdType: 'rom', thresholdValue: 160, relatedJoints: ['shoulder_flexion'], relatedTargets: ['rotator_cuff', 'deltoid', 'shoulder'] },
  { id: 'fm_hair', label: 'Can reach behind head', description: 'Shoulder ER + abduction sufficient for grooming', thresholdType: 'rom', thresholdValue: 60, relatedJoints: ['shoulder_er'], relatedTargets: ['rotator_cuff', 'shoulder'] },
  { id: 'fm_stairs', label: 'Pain-free stair climbing', description: 'Knee flexion ≥90° with pain ≤3/10', thresholdType: 'function', thresholdValue: 3, relatedJoints: ['knee_flexion'], relatedTargets: ['quad', 'knee'] },
  { id: 'fm_sit_stand', label: 'Independent sit-to-stand', description: 'Hip and knee flexion adequate with manageable pain', thresholdType: 'function', thresholdValue: 4, relatedJoints: ['hip_flexion', 'knee_flexion'], relatedTargets: ['quad', 'glute', 'hip'] },
  { id: 'fm_walking', label: 'Community-distance walking', description: 'Pain ≤3/10 during 30-min walking', thresholdType: 'pain', thresholdValue: 3, relatedJoints: [], relatedTargets: ['calf', 'ankle', 'glute', 'hip'] },
  { id: 'fm_pain_halved', label: 'Pain halved from baseline', description: 'Average pain severity reduced by 50%', thresholdType: 'pain', thresholdValue: 50, relatedJoints: [], relatedTargets: [] },
  { id: 'fm_sling_70', label: 'Sling integrity ≥70%', description: 'Force transfer chains functioning adequately', thresholdType: 'sling', thresholdValue: 70, relatedJoints: [], relatedTargets: [] },
  { id: 'fm_squat', label: 'Bodyweight squat', description: 'Full squat depth with adequate control', thresholdType: 'function', thresholdValue: 4, relatedJoints: ['knee_flexion', 'hip_flexion', 'ankle_dorsiflexion'], relatedTargets: ['quad', 'glute', 'calf'] },
  { id: 'fm_sleep', label: 'Sleep through night', description: 'Night pain eliminated', thresholdType: 'pain', thresholdValue: 2, relatedJoints: [], relatedTargets: [] },
];

function computeInterSessionHealing(
  daysBetween: number,
  sessionNumber: number,
  totalSessions: number,
  pm: PatientModifierProfile | null,
): InterSessionHealing {
  const healingRate = pm ? pm.interSessionHealingMultiplier : 1.0;
  const tissueRemodeling = Math.min(daysBetween * 0.3 * healingRate, 3.0);
  const sessionFrac = sessionNumber / totalSessions;
  const exerciseCarryOver = sessionFrac > 0.1
    ? Math.min(2.0 * sessionFrac * healingRate, 2.5) * Math.exp(-0.15 * daysBetween)
    : 0;
  const inflammationCurve = daysBetween <= 1
    ? -0.5
    : daysBetween <= 2
    ? 0.8
    : Math.min(1.5, 1.0 + (daysBetween - 2) * 0.1);
  const inflammationResolution = inflammationCurve * healingRate;
  const netHealingDelta = tissueRemodeling + exerciseCarryOver + inflammationResolution;
  return { tissueRemodeling, exerciseCarryOver, inflammationResolution, netHealingDelta };
}

function computeNonLinearRecoveryFactor(
  sessionNumber: number,
  totalSessions: number,
  currentRisk: number,
  startingRisk: number,
  consecutivePlateaus: number,
  cp: ConditionRecoveryProfile | null,
  pm: PatientModifierProfile | null,
): { factor: number; isPlateauSession: boolean; isBreakthroughSession: boolean; isSetbackSession: boolean; phaseLabel: string } {
  const sessionFrac = totalSessions > 1 ? sessionNumber / (totalSessions - 1) : 1;
  let factor = 1.0;
  let isPlateauSession = false;
  let isBreakthroughSession = false;
  let isSetbackSession = false;
  let phaseLabel = 'Active Treatment';

  if (cp && cp.phases.length > 0) {
    const cpPhaseIdx = cp.phases.findIndex((_, i) => sessionFrac <= (i + 1) / cp.phases.length);
    const cpPhase = cp.phases[cpPhaseIdx >= 0 ? cpPhaseIdx : cp.phases.length - 1];
    phaseLabel = cpPhase.name;
    const prevPhaseIdx = cpPhaseIdx > 0 ? cpPhaseIdx - 1 : -1;
    if (prevPhaseIdx >= 0) {
      const prevPhaseBoundary = (cpPhaseIdx) / cp.phases.length;
      const distFromBoundary = sessionFrac - prevPhaseBoundary;
      if (distFromBoundary >= 0 && distFromBoundary < 0.05) {
        factor *= 1.3;
        isBreakthroughSession = true;
      }
    }
    if (cpPhase.romCeilingPercent < 60) {
      factor *= 0.5;
      isPlateauSession = true;
    }
  }

  const recoveryProgress = startingRisk > 0 ? (startingRisk - currentRisk) / startingRisk : 0;
  if (recoveryProgress > 0.7) {
    factor *= 0.4 + 0.6 * (1 - recoveryProgress);
  }

  if (consecutivePlateaus >= 3) {
    isPlateauSession = true;
    factor *= 0.3;
  }

  const compliance = pm ? pm.complianceMultiplier : 1.0;
  const irritabilityPenalty = pm && pm.painSensitivityMultiplier > 1.2 ? 0.8 : 1.0;
  factor *= compliance * irritabilityPenalty;

  if (pm && pm.painSensitivityMultiplier > 1.5 && sessionFrac < 0.2) {
    isSetbackSession = true;
    factor *= 0.6;
  }

  return { factor, isPlateauSession, isBreakthroughSession, isSetbackSession, phaseLabel };
}

function captureRomBaselines(
  baseModelConfig: Record<string, Record<string, number>>,
  treatments: SessionTreatment[],
  painMarkers: Array<{ severity?: number }>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  muscleAnalysis: MuscleAnalysisResult,
): RomPrediction[] {
  const relevantJoints = new Set<string>();
  for (const t of treatments) {
    const joints = TARGET_TO_JOINTS[t.target] || [];
    for (const j of joints) relevantJoints.add(j);
  }

  for (const [muscleId, override] of Object.entries(baseOverrides)) {
    if (override.pathology && override.pathology !== 'none') {
      const joints = TARGET_TO_JOINTS[muscleId] || [];
      for (const j of joints) relevantJoints.add(j);
    }
  }

  for (const group of muscleAnalysis.groups) {
    const t = group.avgTightness ?? 50;
    if (t > 70 || t < 25) {
      const joints = TARGET_TO_JOINTS[group.id] || [];
      for (const j of joints) relevantJoints.add(j);
    }
  }

  if (relevantJoints.size === 0) {
    for (const t of treatments) {
      for (const [_, joints] of Object.entries(TARGET_TO_JOINTS)) {
        if (joints.length > 0) { relevantJoints.add(joints[0]); break; }
      }
    }
  }

  const posture = baseModelConfig['posture'] || {};
  const jointConfig = baseModelConfig['joints'] || {};

  const perMarkerSeverity: Record<string, number> = {};
  const relevantJointArr = Array.from(relevantJoints);
  for (const pm of painMarkers) {
    const sev = pm.severity ?? 5;
    for (const jId of relevantJointArr) {
      const norm = JOINT_ROM_NORMS[jId];
      if (!norm) continue;
      perMarkerSeverity[jId] = Math.max(perMarkerSeverity[jId] ?? 0, sev);
    }
  }

  const pathologyPenalties: Record<string, number> = {};
  for (const [muscleId, override] of Object.entries(baseOverrides)) {
    if (!override.pathology || override.pathology === 'none') continue;
    const joints = TARGET_TO_JOINTS[muscleId] || [];
    const pathStr = String(override.pathology).toLowerCase();
    const penalty = pathStr === 'tear' ? 0.4
      : pathStr === 'strain' ? 0.25
      : pathStr === 'tendinopathy' ? 0.2
      : pathStr === 'impingement' ? 0.15
      : 0.1;
    for (const jId of joints) {
      pathologyPenalties[jId] = Math.max(pathologyPenalties[jId] ?? 0, penalty);
    }
  }

  const tightnessPenalties: Record<string, number> = {};
  for (const group of muscleAnalysis.groups) {
    const avgTight = group.avgTightness ?? 50;
    if (avgTight > 65) {
      const joints = TARGET_TO_JOINTS[group.id] || [];
      const penalty = (avgTight - 65) / 100;
      for (const jId of joints) {
        tightnessPenalties[jId] = Math.max(tightnessPenalties[jId] ?? 0, penalty);
      }
    }
  }

  return Array.from(relevantJoints).map(jointId => {
    const norm = JOINT_ROM_NORMS[jointId];
    if (!norm) return null;

    const configuredRom = jointConfig[jointId] ?? norm.normalDegrees;
    const painSev = perMarkerSeverity[jointId] ?? 0;
    const painReduction = painSev / 10 * 0.3;
    const pathPenalty = pathologyPenalties[jointId] ?? 0;
    const tightPenalty = tightnessPenalties[jointId] ?? 0;
    const posturalDeviation = Object.values(posture).reduce((sum, v) => sum + Math.abs(v as number), 0) / 100 * 0.05;

    const totalReduction = clamp(painReduction + pathPenalty + tightPenalty + posturalDeviation, 0, 0.8);
    const currentDeg = Math.round(configuredRom * (1 - totalReduction));

    const limitingFactor = pathPenalty > painReduction && pathPenalty > tightPenalty
      ? 'Pathology-limited'
      : painReduction > tightPenalty
      ? 'Pain-limited'
      : tightPenalty > 0.05
      ? 'Muscle tightness'
      : 'Tissue restriction';

    return {
      jointId,
      jointLabel: norm.label,
      plane: norm.plane,
      currentDegrees: currentDeg,
      targetDegrees: norm.normalDegrees,
      predictedDegrees: currentDeg,
      deltaFromBaseline: 0,
      limitingFactor,
    };
  }).filter((r): r is RomPrediction => r !== null);
}

function capturePainBaselines(
  painMarkers: Array<{ id: string; label: string; severity?: number; type: string }>,
): PainMarkerPrediction[] {
  return painMarkers.map(pm => ({
    markerId: pm.id,
    markerLabel: pm.label,
    baselineSeverity: pm.severity ?? 5,
    predictedSeverity: pm.severity ?? 5,
    deltaFromBaseline: 0,
    mechanism: pm.type === 'referred' ? 'Referred pain'
      : pm.type === 'area' ? 'Regional nociceptive'
      : pm.type === 'line' ? 'Linear tension pattern'
      : pm.type === 'paint' ? 'Diffuse pain region'
      : 'Local nociceptive',
  }));
}

function captureMuscleBaselines(
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  muscleAnalysis: MuscleAnalysisResult,
  treatments: SessionTreatment[],
): MuscleStatePrediction[] {
  const relevantMuscles = new Set<string>();
  for (const t of treatments) {
    relevantMuscles.add(t.target);
  }
  for (const muscleId of Object.keys(baseOverrides)) {
    relevantMuscles.add(muscleId);
  }

  return Array.from(relevantMuscles).map(muscleId => {
    const override = baseOverrides[muscleId];
    const group = muscleAnalysis.groups.find(g => g.id === muscleId);
    const tension = group?.avgTightness ?? 50;
    const activation = group?.avgActivation ?? (tension > 60 ? 0.8 : tension > 40 ? 0.5 : 0.3);
    const pathology = override?.pathology && override.pathology !== 'none' ? override.pathology : null;

    let clinicalNote = 'Within normal limits';
    if (pathology) {
      clinicalNote = `Active pathology: ${pathology}`;
    } else if (tension > 70) {
      clinicalNote = `Hypertonic (${Math.round(tension)}% tension)`;
    } else if (tension < 30) {
      clinicalNote = `Inhibited (${Math.round(tension)}% tension)`;
    }

    return {
      muscleId,
      muscleLabel: group?.label ?? muscleId.replace(/_/g, ' '),
      baselineTension: tension,
      predictedTension: tension,
      baselineActivation: activation,
      predictedActivation: activation,
      trendDirection: 'stable' as const,
      clinicalNote,
    };
  });
}

function captureSlingBaselines(
  muscleAnalysis: MuscleAnalysisResult,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  slingAnalysis: SlingAnalysisResult | null,
): SlingPrediction[] {
  if (slingAnalysis && slingAnalysis.slings.length > 0) {
    return slingAnalysis.slings.map(sr => ({
      slingId: sr.slingId,
      slingName: sr.label,
      baselineIntegrity: Math.round(sr.activationScore),
      predictedIntegrity: Math.round(sr.activationScore),
      deltaFromBaseline: 0,
      weakLinks: sr.weakLinks.map(wl => wl.muscle),
    }));
  }

  return SLING_DEFINITIONS.map(sling => {
    let totalScore = 0;
    let count = 0;
    const weakLinks: string[] = [];
    for (const muscle of sling.muscles) {
      const group = muscleAnalysis.groups.find(g => g.id === muscle);
      const tension = group?.avgTightness ?? 50;
      const override = baseOverrides[muscle];
      const hasPathology = override?.pathology && override.pathology !== 'none';
      totalScore += tension;
      count++;
      if (tension < 35 || tension > 75 || hasPathology) {
        weakLinks.push(muscle);
      }
    }
    const avgTension = count > 0 ? totalScore / count : 50;
    const integrity = clamp(100 - Math.abs(avgTension - 50) * 2 - weakLinks.length * 12, 0, 100);
    return {
      slingId: sling.id,
      slingName: sling.name,
      baselineIntegrity: Math.round(integrity),
      predictedIntegrity: Math.round(integrity),
      deltaFromBaseline: 0,
      weakLinks,
    };
  });
}

function capturePosturalBaselines(
  baseModelConfig: Record<string, Record<string, number>>,
): PosturalPrediction[] {
  const posture = baseModelConfig['posture'] || {};
  return Object.entries(POSTURE_SLIDER_NORMS).map(([sliderId, norm]) => {
    const currentVal = posture[sliderId] ?? 0;
    return {
      sliderId,
      sliderLabel: norm.label,
      baselineValue: currentVal,
      predictedValue: currentVal,
      normalValue: norm.normalValue,
      correctionPercent: 0,
    };
  }).filter(p => Math.abs(p.baselineValue) > 0.5);
}

function captureCompensationBaselines(
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  muscleAnalysis: MuscleAnalysisResult,
  whatIfComparison: WhatIfComparisonResult | null,
): CompensationPrediction[] {
  const patterns: CompensationPrediction[] = [];

  if (whatIfComparison && whatIfComparison.compensationDeltas.length > 0) {
    for (const cd of whatIfComparison.compensationDeltas) {
      const patId = cd.pattern.replace(/\s+/g, '_').toLowerCase();
      patterns.push({
        patternId: `comp_${patId}`,
        patternLabel: `${cd.pattern} Compensation`,
        baselineSeverity: Math.round(cd.before),
        predictedSeverity: Math.round(cd.before),
        resolutionPercent: 0,
        contributingFactors: [cd.pattern],
      });
    }
  }

  if (patterns.length === 0) {
    const highTensionMuscles: string[] = [];
    const lowTensionMuscles: string[] = [];
    for (const group of muscleAnalysis.groups) {
      const t = group.avgTightness ?? 50;
      if (t > 70) highTensionMuscles.push(group.id);
      if (t < 30) lowTensionMuscles.push(group.id);
    }

    if (highTensionMuscles.length > 0 && lowTensionMuscles.length > 0) {
      patterns.push({
        patternId: 'comp_tension_imbalance',
        patternLabel: 'Tension Imbalance Pattern',
        baselineSeverity: Math.min(100, (highTensionMuscles.length + lowTensionMuscles.length) * 15),
        predictedSeverity: Math.min(100, (highTensionMuscles.length + lowTensionMuscles.length) * 15),
        resolutionPercent: 0,
        contributingFactors: [
          `Hypertonic: ${highTensionMuscles.join(', ')}`,
          `Inhibited: ${lowTensionMuscles.join(', ')}`,
        ],
      });
    }

    const pathologyMuscles = Object.entries(baseOverrides)
      .filter(([_, o]) => o.pathology && o.pathology !== 'none')
      .map(([id]) => id);
    if (pathologyMuscles.length > 0) {
      patterns.push({
        patternId: 'comp_pathology_guard',
        patternLabel: 'Pathology Guarding Pattern',
        baselineSeverity: Math.min(100, pathologyMuscles.length * 25),
        predictedSeverity: Math.min(100, pathologyMuscles.length * 25),
        resolutionPercent: 0,
        contributingFactors: pathologyMuscles.map(m => `${m}: protective guarding`),
      });
    }
  }

  return patterns;
}

function selectRelevantMilestones(
  treatments: SessionTreatment[],
  painMarkers: Array<{ severity?: number }>,
): FunctionalMilestone[] {
  const allTargets = new Set(treatments.map(t => t.target));
  const allJoints = new Set<string>();
  for (const t of treatments) {
    const joints = TARGET_TO_JOINTS[t.target] || [];
    for (const j of joints) allJoints.add(j);
  }

  const avgPain = painMarkers.length > 0
    ? painMarkers.reduce((s, p) => s + (p.severity ?? 5), 0) / painMarkers.length
    : 5;

  return FUNCTIONAL_MILESTONE_TEMPLATES
    .filter(tmpl => {
      if (tmpl.thresholdType === 'pain' || tmpl.thresholdType === 'sling') return true;
      const hasRelatedTarget = tmpl.relatedTargets.some(t => allTargets.has(t));
      const hasRelatedJoint = tmpl.relatedJoints.some(j => allJoints.has(j));
      return hasRelatedTarget || hasRelatedJoint;
    })
    .map(tmpl => ({
      id: tmpl.id,
      label: tmpl.label,
      description: tmpl.description,
      triggeredAtSession: null,
      thresholdType: tmpl.thresholdType,
      thresholdValue: tmpl.thresholdType === 'pain' && tmpl.id === 'fm_pain_halved'
        ? avgPain * 0.5
        : tmpl.thresholdValue,
      currentValue: tmpl.thresholdType === 'pain' ? avgPain : 0,
      achieved: false,
    }));
}

function parseFrequencyToDaysInterval(frequency: string): number {
  const lower = frequency.toLowerCase().trim();
  if (/daily|every\s*day|1x?\s*\/?\s*day|7\s*x?\s*\/?\s*week/i.test(lower)) return 1;
  if (/2x?\s*\/?\s*day|twice\s*(a|per)\s*day|bid/i.test(lower)) return 1;
  if (/6x?\s*\/?\s*week/i.test(lower)) return 1;
  if (/5x?\s*\/?\s*week/i.test(lower)) return 1.4;
  if (/4x?\s*\/?\s*week/i.test(lower)) return 1.75;
  if (/3x?\s*\/?\s*week/i.test(lower)) return 2.33;
  if (/2x?\s*\/?\s*week|twice\s*(a|per)\s*week/i.test(lower)) return 3.5;
  if (/1x?\s*\/?\s*week|once\s*(a|per)\s*week|weekly/i.test(lower)) return 7;
  if (/every\s*other\s*day|alternate/i.test(lower)) return 2;
  if (/2x?\s*\/?\s*month|fortnightly|bi-?weekly/i.test(lower)) return 14;
  if (/1x?\s*\/?\s*month|monthly/i.test(lower)) return 30;
  const match = lower.match(/(\d+)\s*x?\s*\/?\s*(week|day|month)/i);
  if (match) {
    const count = parseInt(match[1]);
    const period = match[2].toLowerCase();
    if (period === 'day') return 1 / Math.max(count, 1);
    if (period === 'week') return 7 / Math.max(count, 1);
    if (period === 'month') return 30 / Math.max(count, 1);
  }
  return 2.33;
}

function estimateTotalDuration(
  painMarkers: Array<{ severity?: number }>,
  numExercises: number,
  numTechniques: number,
): number {
  const avgSeverity = painMarkers.length > 0
    ? painMarkers.reduce((s, p) => s + (p.severity ?? 5), 0) / painMarkers.length
    : 5;
  const complexityFactor = Math.min((numExercises + numTechniques) / 4, 2);
  const severityWeeks = avgSeverity <= 3 ? 6 : avgSeverity <= 5 ? 8 : avgSeverity <= 7 ? 10 : 12;
  return Math.round(severityWeeks * (0.8 + complexityFactor * 0.2));
}

function classifyCustomExerciseTarget(
  exercise: CustomExercise,
): { target: string; targetType: 'muscle' | 'joint'; intervention: InterventionType } {
  const nameLower = exercise.name.toLowerCase().replace(/[-\s]+/g, '_');
  const systemLower = exercise.targetSystem.toLowerCase();
  const clinicalLower = exercise.clinicalTarget.toLowerCase();
  const combined = `${nameLower} ${systemLower} ${clinicalLower}`;

  for (const [keyword, mapping] of Object.entries(EXERCISE_NAME_TO_TARGET)) {
    if (combined.includes(keyword)) {
      return mapping;
    }
  }
  for (const [keyword, mapping] of Object.entries(REGION_TARGET_MAP)) {
    if (combined.includes(keyword)) {
      return mapping;
    }
  }
  return { target: 'core', targetType: 'muscle', intervention: 'strengthen' };
}

function classifyCustomTechniqueTarget(
  technique: CustomTechnique,
): { target: string; targetType: 'muscle' | 'joint'; intervention: InterventionType } {
  const nameLower = technique.name.toLowerCase().replace(/[-\s]+/g, '_');
  const systemLower = technique.targetSystem.toLowerCase();
  const clinicalLower = technique.clinicalTarget.toLowerCase();
  const combined = `${nameLower} ${systemLower} ${clinicalLower}`;

  for (const [keyword, mapping] of Object.entries(EXERCISE_NAME_TO_TARGET)) {
    if (combined.includes(keyword)) {
      return { ...mapping, intervention: mapping.intervention === 'strengthen' ? 'mobilize' : mapping.intervention };
    }
  }
  for (const [keyword, mapping] of Object.entries(REGION_TARGET_MAP)) {
    if (combined.includes(keyword)) {
      return { ...mapping, intervention: 'mobilize' };
    }
  }
  return { target: 'spine', targetType: 'joint', intervention: 'mobilize' };
}

function getSessionDoseResponse(sessionNumber: number, totalSessions: number, interventionType: InterventionType): number {
  const fraction = totalSessions > 1 ? sessionNumber / (totalSessions - 1) : 1;
  switch (interventionType) {
    case 'mobilize':
      if (fraction <= 0.2) return fraction * 2.5 * 0.4;
      if (fraction <= 0.5) return 0.4 + (fraction - 0.2) * (0.55 / 0.3);
      return Math.min(0.95 + (fraction - 0.5) * 0.1, 1);
    case 'stretch':
      if (fraction <= 0.3) return fraction * (0.45 / 0.3);
      if (fraction <= 0.7) return 0.45 + (fraction - 0.3) * (0.4 / 0.4);
      return Math.min(0.85 + (fraction - 0.7) * 0.5, 1);
    case 'strengthen':
      if (fraction <= 0.15) return fraction * (0.15 / 0.15);
      if (fraction <= 0.4) return 0.15 + (fraction - 0.15) * (0.35 / 0.25);
      if (fraction <= 0.7) return 0.5 + (fraction - 0.4) * (0.35 / 0.3);
      return Math.min(0.85 + (fraction - 0.7) * 0.5, 1);
    case 'offload':
      return Math.min(fraction * 1.5, 1);
    default:
      return getDoseResponseFraction(Math.round(fraction * 12));
  }
}

export function buildSessionTimeline(
  customExercises: CustomExercise[],
  customTechniques: CustomTechnique[],
  baseModelConfig: Record<string, Record<string, number>>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  painMarkers: Array<{ id: string; position: { x: number; y: number; z: number }; label: string; type: 'point' | 'area' | 'referred' | 'line' | 'paint'; severity?: number; description?: string }>,
  bodyWeightKg: number,
  biomechanicsOutput?: unknown | null,
  patientModifiers?: PatientModifierProfile | null,
  conditionProfile?: ConditionRecoveryProfile | null,
  actualOutcomes?: ActualSessionOutcome[],
): SessionTimelineResult {
  const pm = patientModifiers ?? null;
  const cp = conditionProfile ?? null;
  const allFrequencies: number[] = [];
  for (const ex of customExercises) {
    allFrequencies.push(parseFrequencyToDaysInterval(ex.dosage.frequency));
  }
  for (const tech of customTechniques) {
    allFrequencies.push(parseFrequencyToDaysInterval(tech.dosage.frequency));
  }
  const sessionIntervalDays = allFrequencies.length > 0
    ? Math.max(1, Math.round(Math.min(...allFrequencies)))
    : 2;

  const rawDurationWeeks = estimateTotalDuration(painMarkers, customExercises.length, customTechniques.length);
  const totalDurationWeeks = pm ? Math.round(rawDurationWeeks * pm.durationMultiplier) : rawDurationWeeks;
  const totalDays = totalDurationWeeks * 7;
  const totalSessions = Math.max(4, Math.ceil(totalDays / sessionIntervalDays));

  const treatments: SessionTreatment[] = [];
  for (const ex of customExercises) {
    const classification = classifyCustomExerciseTarget(ex);
    treatments.push({
      name: ex.name,
      type: 'exercise',
      targetStructure: ex.targetSystem,
      interventionType: classification.intervention,
      target: classification.target,
      targetType: classification.targetType,
      magnitude: classification.intervention === 'mobilize' ? 10 : 15,
      dosageLabel: `${ex.dosage.sets}×${ex.dosage.reps} @ ${ex.dosage.tempo}`,
      frequency: ex.dosage.frequency,
    });
  }
  for (const tech of customTechniques) {
    const classification = classifyCustomTechniqueTarget(tech);
    treatments.push({
      name: tech.name,
      type: 'manual_therapy',
      targetStructure: tech.targetSystem,
      interventionType: classification.intervention,
      target: classification.target,
      targetType: classification.targetType,
      magnitude: classification.intervention === 'mobilize' ? 12 : 10,
      dosageLabel: `${tech.dosage.sets}×${tech.dosage.repetitions}, ${tech.dosage.duration}`,
      frequency: tech.dosage.frequency,
    });
  }

  const baseMuscles = computeFullMuscleAnalysis(baseModelConfig);
  const appliedMuscles = applyOverridesToAnalysis(baseMuscles, baseOverrides as Record<string, MuscleOverride>);

  let startingRisk = 50;
  let startingSlingIntegrity = 50;
  try {
    const baseComparison = computeWhatIfComparison(
      baseModelConfig, baseOverrides, painMarkers, bodyWeightKg,
      [{ id: '__noop', label: '', description: '', interventionType: 'offload', target: 'cadence', targetType: 'joint', magnitude: 0, unit: '%', color: '#000' }],
      appliedMuscles, biomechanicsOutput
    );
    startingRisk = baseComparison.overallRiskBefore;
    startingSlingIntegrity = baseComparison.forceTransferScoreBefore;
  } catch {
    console.warn('[SessionTimeline] Baseline risk computation failed, using defaults');
  }

  let baselineComparison: WhatIfComparisonResult | null = null;
  try {
    baselineComparison = computeWhatIfComparison(
      baseModelConfig, baseOverrides, painMarkers, bodyWeightKg,
      [{ id: '__noop', label: '', description: '', interventionType: 'offload', target: 'cadence', targetType: 'joint', magnitude: 0, unit: '%', color: '#000' }],
      appliedMuscles, biomechanicsOutput
    );
  } catch { /* use null */ }

  let slingAnalysis: SlingAnalysisResult | null = null;
  try {
    slingAnalysis = computeSlingAnalysis({
      biomechanicsOutput: biomechanicsOutput as Parameters<typeof computeSlingAnalysis>[0]['biomechanicsOutput'],
      muscleOverrides: baseOverrides as Record<string, { tension?: number; pathology?: string }>,
    });
  } catch { /* use null */ }

  const romBaselines = captureRomBaselines(baseModelConfig, treatments, painMarkers, baseOverrides, appliedMuscles);
  const painBaselines = capturePainBaselines(painMarkers.map(pm => ({ id: pm.id, label: pm.label, severity: pm.severity, type: pm.type })));
  const muscleBaselines = captureMuscleBaselines(baseOverrides, appliedMuscles, treatments);
  const slingBaselines = captureSlingBaselines(appliedMuscles, baseOverrides, slingAnalysis);
  const posturalBaselines = capturePosturalBaselines(baseModelConfig);
  const compensationBaselines = captureCompensationBaselines(baseOverrides, appliedMuscles, baselineComparison);
  const funcMilestones = selectRelevantMilestones(treatments, painMarkers);

  const baseline: MultiDimensionalBaseline = {
    romBaselines,
    painBaselines,
    muscleBaselines,
    slingBaselines,
    posturalBaselines,
    compensationBaselines,
  };

  interface TreatmentDeltaProfile {
    romDeltas: Record<string, number>;
    painDelta: number;
    tensionDelta: number;
    slingBoost: Record<string, number>;
    posturalCorrection: Record<string, number>;
    compensationReduction: number;
    loadIntensity: number;
  }

  const treatmentDeltaMap = new Map<string, TreatmentDeltaProfile>();

  for (const t of treatments) {
    const instanceKey = `${t.name}_${t.target}_${t.interventionType}`;

    const dosageParts = t.dosageLabel.match(/(\d+)/g);
    const sets = dosageParts && dosageParts[0] ? parseInt(dosageParts[0], 10) : 3;
    const reps = dosageParts && dosageParts[1] ? parseInt(dosageParts[1], 10) : 10;
    const dosageIntensity = clamp((sets * reps) / 36, 0.3, 2.0);

    const nameHints = t.name.toLowerCase();
    const isEccentric = nameHints.includes('eccentric') || nameHints.includes('negative');
    const isIsometric = nameHints.includes('isometric') || nameHints.includes('hold');
    const isOscillatory = nameHints.includes('oscillat') || nameHints.includes('grade') || nameHints.includes('mobilisation');
    const isSoftTissue = nameHints.includes('release') || nameHints.includes('massage') || nameHints.includes('needling');
    const isStretching = nameHints.includes('stretch') || nameHints.includes('lengthen');
    const isStrengthening = nameHints.includes('strengthen') || nameHints.includes('resist') || nameHints.includes('load');

    const romDeltas: Record<string, number> = {};
    const joints = TARGET_TO_JOINTS[t.target] || [];
    for (const jId of joints) {
      const norm = JOINT_ROM_NORMS[jId];
      if (!norm) continue;
      let baseDelta = t.interventionType === 'mobilize' ? 3.0
        : t.interventionType === 'stretch' ? 2.0
        : 1.0;
      if (isOscillatory) baseDelta *= 1.4;
      if (isEccentric) baseDelta *= 0.8;
      if (isStretching) baseDelta *= 1.3;
      romDeltas[jId] = baseDelta * dosageIntensity;
    }

    let painDelta = t.interventionType === 'mobilize' ? -0.4
      : t.interventionType === 'stretch' ? -0.3
      : t.interventionType === 'strengthen' ? -0.2
      : -0.15;
    if (isSoftTissue) painDelta *= 1.5;
    if (isIsometric) painDelta *= 1.3;
    if (isEccentric && t.interventionType === 'strengthen') painDelta *= 0.7;
    painDelta *= dosageIntensity;

    let tensionDelta = t.interventionType === 'stretch' ? -3
      : t.interventionType === 'mobilize' ? -2
      : t.interventionType === 'strengthen' ? 2
      : 0;
    if (isSoftTissue) tensionDelta = Math.min(tensionDelta, -4);
    if (isIsometric) tensionDelta *= 0.5;
    tensionDelta *= dosageIntensity;

    const slingBoost: Record<string, number> = {};
    for (const sling of SLING_DEFINITIONS) {
      if (sling.muscles.includes(t.target)) {
        let base = t.interventionType === 'strengthen' ? 2.0
          : t.interventionType === 'mobilize' ? 1.5
          : 1.0;
        if (isEccentric) base *= 1.3;
        slingBoost[sling.id] = base * dosageIntensity;
      }
    }

    const posturalCorrection: Record<string, number> = {};
    if (t.target === 'core' || t.target === 'spine') {
      posturalCorrection['lumbarLordosis'] = 0.5 * dosageIntensity;
      posturalCorrection['pelvicTilt'] = 0.4 * dosageIntensity;
    }
    if (t.target === 'scapula' || t.target === 'rotator_cuff') {
      posturalCorrection['shoulderProtraction'] = 0.5 * dosageIntensity;
      posturalCorrection['thoracicKyphosis'] = 0.3 * dosageIntensity;
    }
    if (t.target === 'neck') {
      posturalCorrection['headForward'] = 0.6 * dosageIntensity;
      posturalCorrection['headTilt'] = 0.3 * dosageIntensity;
    }
    if (t.target === 'glute' || t.target === 'hip_flexor') {
      posturalCorrection['pelvicTilt'] = 0.5 * dosageIntensity;
    }

    let compensationReduction = t.interventionType === 'strengthen' ? 3
      : t.interventionType === 'mobilize' ? 2
      : 1.5;
    if (isEccentric) compensationReduction *= 1.4;
    compensationReduction *= dosageIntensity;

    const loadIntensity = dosageIntensity * (isEccentric ? 1.4 : isIsometric ? 0.7 : 1.0) * t.magnitude / 10;

    const profile = { romDeltas, painDelta, tensionDelta, slingBoost, posturalCorrection, compensationReduction, loadIntensity };
    treatmentDeltaMap.set(instanceKey, profile);
    const genericKey = `${t.target}_${t.interventionType}`;
    if (!treatmentDeltaMap.has(genericKey)) {
      treatmentDeltaMap.set(genericKey, profile);
    }
  }

  const sessions: SessionSnapshot[] = [];
  const milestones: SimulationMilestone[] = [];
  const modifications: SessionModification[] = [];
  let prevRisk = startingRisk;
  let plateauCount = 0;
  const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6', '#10b981', '#ef4444'];

  const treatmentSessionCounts = new Map<string, number>();
  for (const t of treatments) {
    treatmentSessionCounts.set(`${t.target}_${t.interventionType}`, 0);
  }

  let cumulativeRomDeltas: Record<string, number> = {};
  let cumulativePainDeltas: Record<string, number> = {};
  let cumulativeTensionDeltas: Record<string, number> = {};
  let cumulativeSlingBoosts: Record<string, number> = {};
  let cumulativePosturalCorrections: Record<string, number> = {};
  let cumulativeCompReductions: Record<string, number> = {};
  let cumulativeLoadIntensity = 0;
  const reinforcedJointsThisSession = new Set<string>();
  const reinforcedMusclesThisSession = new Set<string>();
  const reinforcedSlingsThisSession = new Set<string>();

  for (let s = 1; s <= totalSessions; s++) {
    const dayOffset = (s - 1) * sessionIntervalDays;
    const sessionTreatments: SessionTreatment[] = [];
    reinforcedJointsThisSession.clear();
    reinforcedMusclesThisSession.clear();
    reinforcedSlingsThisSession.clear();

    for (const t of treatments) {
      const treatmentInterval = parseFrequencyToDaysInterval(t.frequency);
      const roundedInterval = Math.max(1, Math.round(treatmentInterval));
      if (treatmentInterval <= sessionIntervalDays || dayOffset % roundedInterval === 0) {
        sessionTreatments.push(t);
      }
    }

    for (const t of sessionTreatments) {
      const key = `${t.target}_${t.interventionType}`;
      treatmentSessionCounts.set(key, (treatmentSessionCounts.get(key) ?? 0) + 1);
    }

    let conditionTreatmentResponsiveness: Record<string, number> = {};
    let conditionPhaseRomCeiling = 1.0;
    if (cp && cp.phases.length > 0) {
      const sessionFrac = totalSessions > 0 ? s / totalSessions : 0;
      const cpPhaseIdx = cp.phases.findIndex((_, i) => sessionFrac <= (i + 1) / cp.phases.length);
      const cpPhase = cp.phases[cpPhaseIdx >= 0 ? cpPhaseIdx : cp.phases.length - 1];
      conditionTreatmentResponsiveness = cpPhase.treatmentResponsiveness;
      conditionPhaseRomCeiling = cpPhase.romCeilingPercent / 100;
    }

    const nonLinear = computeNonLinearRecoveryFactor(s, totalSessions, prevRisk, startingRisk, plateauCount, cp, pm);

    const interSessionHealing = s > 1
      ? computeInterSessionHealing(sessionIntervalDays, s, totalSessions, pm)
      : null;

    const irritabilityThreshold = pm ? (10 / pm.painSensitivityMultiplier) : 10;

    let predictedSessionLoad = 0;
    for (const t of sessionTreatments) {
      const instanceKey = `${t.name}_${t.target}_${t.interventionType}`;
      const key = `${t.target}_${t.interventionType}`;
      const deltas = treatmentDeltaMap.get(instanceKey) || treatmentDeltaMap.get(key);
      if (deltas) predictedSessionLoad += deltas.loadIntensity;
    }
    const projectedCumulativeLoad = cumulativeLoadIntensity + predictedSessionLoad;
    const loadExceedsIrritability = projectedCumulativeLoad > irritabilityThreshold * (s * 0.7);

    if (loadExceedsIrritability) {
      nonLinear.isSetbackSession = true;
      nonLinear.factor *= 0.4;
    }

    const scenarios: WhatIfScenario[] = [];
    const seen = new Set<string>();
    let colorIdx = 0;
    let sessionLoadSum = 0;

    for (const t of sessionTreatments) {
      const key = `${t.target}_${t.interventionType}`;
      const instanceKey = `${t.name}_${t.target}_${t.interventionType}`;

      if (seen.has(key)) {
        const existing = scenarios.find(sc => sc.id.startsWith(`sess_${key}_`));
        if (existing) {
          const cumulativeCount = treatmentSessionCounts.get(key) ?? 1;
          const doseResp = getSessionDoseResponse(cumulativeCount, totalSessions, t.interventionType);
          existing.magnitude = Math.min(existing.magnitude + t.magnitude * doseResp * 0.3, existing.magnitude * 1.5);
        }
        continue;
      }
      seen.add(key);

      let conditionResponsiveFactor = 1.0;
      if (Object.keys(conditionTreatmentResponsiveness).length > 0) {
        const entryKey = t.interventionType.toLowerCase();
        const entryName = t.name.toLowerCase().replace(/[-\s]+/g, '_');
        for (const [trKey, trVal] of Object.entries(conditionTreatmentResponsiveness)) {
          const trKeyLower = trKey.toLowerCase();
          if (entryKey.includes(trKeyLower) || entryName.includes(trKeyLower) || trKeyLower.includes(entryKey)) {
            conditionResponsiveFactor = trVal;
            break;
          }
        }
      }

      const cumulativeCount = treatmentSessionCounts.get(key) ?? 1;
      const doseResp = getSessionDoseResponse(cumulativeCount, totalSessions, t.interventionType);
      const doseScale = pm ? pm.perSessionDoseScale : 1;
      const scaledMag = t.magnitude * doseResp * conditionResponsiveFactor * doseScale * nonLinear.factor;
      if (scaledMag < 0.5) continue;

      const deltas = treatmentDeltaMap.get(instanceKey) || treatmentDeltaMap.get(key);
      if (deltas) {
        const recoveryFactor = nonLinear.factor * conditionResponsiveFactor * doseScale;

        if (loadExceedsIrritability) {
          for (const [jId, delta] of Object.entries(deltas.romDeltas)) {
            cumulativeRomDeltas[jId] = (cumulativeRomDeltas[jId] ?? 0) - delta * 0.3;
            reinforcedJointsThisSession.add(jId);
          }
          for (const pmk of painBaselines) {
            cumulativePainDeltas[pmk.markerId] = (cumulativePainDeltas[pmk.markerId] ?? 0) + Math.abs(deltas.painDelta) * 0.5;
          }
          cumulativeTensionDeltas[t.target] = (cumulativeTensionDeltas[t.target] ?? 0) + Math.abs(deltas.tensionDelta) * 0.4;
          reinforcedMusclesThisSession.add(t.target);
          for (const [sId] of Object.entries(deltas.slingBoost)) {
            cumulativeSlingBoosts[sId] = (cumulativeSlingBoosts[sId] ?? 0) - 1.0;
            reinforcedSlingsThisSession.add(sId);
          }
          for (const cp of compensationBaselines) {
            const isRelevant = cp.contributingFactors.some(f => f.toLowerCase().includes(t.target));
            if (isRelevant) {
              cumulativeCompReductions[cp.patternId] = (cumulativeCompReductions[cp.patternId] ?? 0) - deltas.compensationReduction * 0.3;
            }
          }
        } else {
          for (const [jId, delta] of Object.entries(deltas.romDeltas)) {
            cumulativeRomDeltas[jId] = (cumulativeRomDeltas[jId] ?? 0) + delta * recoveryFactor;
            reinforcedJointsThisSession.add(jId);
          }
          for (const pmk of painBaselines) {
            cumulativePainDeltas[pmk.markerId] = (cumulativePainDeltas[pmk.markerId] ?? 0) + deltas.painDelta * recoveryFactor;
          }
          cumulativeTensionDeltas[t.target] = (cumulativeTensionDeltas[t.target] ?? 0) + deltas.tensionDelta * recoveryFactor;
          reinforcedMusclesThisSession.add(t.target);
          for (const [sId, boost] of Object.entries(deltas.slingBoost)) {
            cumulativeSlingBoosts[sId] = (cumulativeSlingBoosts[sId] ?? 0) + boost * recoveryFactor;
            reinforcedSlingsThisSession.add(sId);
          }
          for (const [pId, corr] of Object.entries(deltas.posturalCorrection)) {
            cumulativePosturalCorrections[pId] = (cumulativePosturalCorrections[pId] ?? 0) + corr * recoveryFactor;
          }
          for (const cpb of compensationBaselines) {
            const isRelevant = cpb.contributingFactors.some(f => f.toLowerCase().includes(t.target));
            const compFactor = isRelevant ? 1.0 : 0.2;
            cumulativeCompReductions[cpb.patternId] = (cumulativeCompReductions[cpb.patternId] ?? 0) + deltas.compensationReduction * recoveryFactor * compFactor;
          }
        }
        sessionLoadSum += deltas.loadIntensity;
      }

      scenarios.push({
        id: `sess_${key}_s${s}`,
        label: t.name.length > 20 ? t.name.slice(0, 17) + '...' : t.name,
        description: `${t.interventionType} ${t.target} (session ${s}, day ${dayOffset})`,
        interventionType: t.interventionType,
        target: t.target,
        targetType: t.targetType,
        magnitude: scaledMag,
        unit: t.interventionType === 'mobilize' ? '°' : '%',
        color: colors[colorIdx++ % colors.length],
      });
    }

    cumulativeLoadIntensity += sessionLoadSum;
    const loadDecayFactor = Math.exp(-0.08 * sessionIntervalDays);
    cumulativeLoadIntensity *= loadDecayFactor;

    if (interSessionHealing) {
      const carryOverDecay = Math.exp(-0.12 * sessionIntervalDays);
      const tissueBonus = interSessionHealing.tissueRemodeling * 0.3;
      const exerciseCarryOverRom = interSessionHealing.exerciseCarryOver * 0.2 * carryOverDecay;
      const exerciseCarryOverMuscle = interSessionHealing.exerciseCarryOver * 0.15 * carryOverDecay;
      const exerciseCarryOverSling = interSessionHealing.exerciseCarryOver * 0.25 * carryOverDecay;

      for (const jId of Object.keys(cumulativeRomDeltas)) {
        if (reinforcedJointsThisSession.has(jId)) {
          cumulativeRomDeltas[jId] += tissueBonus + exerciseCarryOverRom;
        } else {
          const regressionRate = 0.15 * sessionIntervalDays / 7;
          cumulativeRomDeltas[jId] = Math.max(0, (cumulativeRomDeltas[jId] ?? 0) - regressionRate);
        }
      }
      for (const pmId of Object.keys(cumulativePainDeltas)) {
        cumulativePainDeltas[pmId] -= interSessionHealing.inflammationResolution * 0.1;
      }
      for (const muscleId of Object.keys(cumulativeTensionDeltas)) {
        if (reinforcedMusclesThisSession.has(muscleId)) {
          const currentDelta = cumulativeTensionDeltas[muscleId] ?? 0;
          if (currentDelta < 0) {
            cumulativeTensionDeltas[muscleId] += exerciseCarryOverMuscle;
          } else {
            cumulativeTensionDeltas[muscleId] -= exerciseCarryOverMuscle * 0.5;
          }
        } else {
          const currentDelta = cumulativeTensionDeltas[muscleId] ?? 0;
          const regressionRate = 0.1 * sessionIntervalDays / 7;
          if (currentDelta < 0) {
            cumulativeTensionDeltas[muscleId] = Math.min(0, currentDelta + regressionRate * 2);
          } else if (currentDelta > 0) {
            cumulativeTensionDeltas[muscleId] = Math.max(0, currentDelta - regressionRate);
          }
        }
      }
      for (const slingId of Object.keys(cumulativeSlingBoosts)) {
        if (reinforcedSlingsThisSession.has(slingId)) {
          cumulativeSlingBoosts[slingId] += exerciseCarryOverSling;
        } else {
          const regressionRate = 0.2 * sessionIntervalDays / 7;
          cumulativeSlingBoosts[slingId] = Math.max(0, (cumulativeSlingBoosts[slingId] ?? 0) - regressionRate);
        }
      }
      for (const pId of Object.keys(cumulativePosturalCorrections)) {
        const regressionRate = 0.05 * sessionIntervalDays / 7;
        cumulativePosturalCorrections[pId] = Math.max(0, (cumulativePosturalCorrections[pId] ?? 0) - regressionRate);
      }
    }

    const sessionRomPredictions: RomPrediction[] = romBaselines.map(rb => {
      const cumDelta = cumulativeRomDeltas[rb.jointId] ?? 0;
      const maxRom = rb.targetDegrees * conditionPhaseRomCeiling * (pm ? pm.romCeilingAdjustment : 1);
      const predicted = clamp(rb.currentDegrees + cumDelta, 0, maxRom);
      return {
        ...rb,
        predictedDegrees: Math.round(predicted * 10) / 10,
        deltaFromBaseline: Math.round((predicted - rb.currentDegrees) * 10) / 10,
        limitingFactor: predicted >= maxRom ? 'ROM ceiling reached' : rb.limitingFactor,
      };
    });

    const sessionPainPredictions: PainMarkerPrediction[] = painBaselines.map(pb => {
      const cumDelta = cumulativePainDeltas[pb.markerId] ?? 0;
      const painSensitivity = pm ? pm.painSensitivityMultiplier : 1;
      const predicted = clamp(pb.baselineSeverity + cumDelta * painSensitivity, 0, 10);
      return {
        ...pb,
        predictedSeverity: Math.round(predicted * 10) / 10,
        deltaFromBaseline: Math.round((predicted - pb.baselineSeverity) * 10) / 10,
      };
    });

    const sessionMusclePredictions: MuscleStatePrediction[] = muscleBaselines.map(mb => {
      const cumTDelta = cumulativeTensionDeltas[mb.muscleId] ?? 0;
      const predicted = clamp(mb.baselineTension + cumTDelta, 10, 90);
      const normalDist = Math.abs(predicted - 50);
      const baseNormalDist = Math.abs(mb.baselineTension - 50);
      const trend: 'improving' | 'stable' | 'worsening' = normalDist < baseNormalDist - 2 ? 'improving' : normalDist > baseNormalDist + 2 ? 'worsening' : 'stable';
      const activation = predicted > 60 ? 0.8 : predicted > 40 ? 0.5 : 0.3;
      return {
        ...mb,
        predictedTension: Math.round(predicted),
        predictedActivation: activation,
        trendDirection: trend,
        clinicalNote: predicted > 70 ? 'Still hypertonic — continue release' : predicted < 30 ? 'Still inhibited — progress activation' : 'Trending toward normal',
      };
    });

    const sessionSlingPredictions: SlingPrediction[] = slingBaselines.map(sb => {
      const cumBoost = cumulativeSlingBoosts[sb.slingId] ?? 0;
      const predicted = clamp(sb.baselineIntegrity + cumBoost, 0, 100);
      return {
        ...sb,
        predictedIntegrity: Math.round(predicted),
        deltaFromBaseline: Math.round(predicted - sb.baselineIntegrity),
        weakLinks: predicted >= 70 ? [] : sb.weakLinks,
      };
    });

    const sessionPosturalPredictions: PosturalPrediction[] = posturalBaselines.map(pb => {
      const cumCorr = cumulativePosturalCorrections[pb.sliderId] ?? 0;
      const deviation = pb.baselineValue - pb.normalValue;
      const correction = Math.min(Math.abs(cumCorr), Math.abs(deviation));
      const predicted = deviation > 0 ? pb.baselineValue - correction : pb.baselineValue + correction;
      const totalDeviation = Math.abs(pb.baselineValue - pb.normalValue);
      const corrPct = totalDeviation > 0 ? (correction / totalDeviation) * 100 : 0;
      return {
        ...pb,
        predictedValue: Math.round(predicted * 100) / 100,
        correctionPercent: Math.round(corrPct),
      };
    });

    const sessionCompPredictions: CompensationPrediction[] = compensationBaselines.map(cb => {
      const patternDelta = cumulativeCompReductions[cb.patternId] ?? 0;
      const resPct = clamp((patternDelta / Math.max(cb.baselineSeverity, 1)) * 100, 0, 100);
      const predicted = cb.baselineSeverity * (1 - resPct / 100);
      return {
        ...cb,
        predictedSeverity: Math.round(predicted),
        resolutionPercent: Math.round(resPct),
      };
    });

    const avgPain = sessionPainPredictions.length > 0
      ? sessionPainPredictions.reduce((sum, p) => sum + p.predictedSeverity, 0) / sessionPainPredictions.length
      : 5;
    const avgSlingIntegrity = sessionSlingPredictions.length > 0
      ? sessionSlingPredictions.reduce((sum, sl) => sum + sl.predictedIntegrity, 0) / sessionSlingPredictions.length
      : startingSlingIntegrity;

    for (const fm of funcMilestones) {
      if (fm.achieved) continue;
      let currentVal = 0;
      if (fm.thresholdType === 'rom') {
        const relatedRom = sessionRomPredictions.find(r =>
          FUNCTIONAL_MILESTONE_TEMPLATES.find(t => t.id === fm.id)?.relatedJoints.includes(r.jointId)
        );
        currentVal = relatedRom?.predictedDegrees ?? 0;
      } else if (fm.thresholdType === 'pain') {
        if (fm.id === 'fm_pain_halved') {
          currentVal = avgPain;
        } else {
          currentVal = avgPain;
        }
      } else if (fm.thresholdType === 'sling') {
        currentVal = avgSlingIntegrity;
      } else if (fm.thresholdType === 'function') {
        currentVal = 10 - avgPain;
      }
      fm.currentValue = Math.round(currentVal * 10) / 10;

      let achieved = false;
      if (fm.thresholdType === 'rom') {
        achieved = currentVal >= fm.thresholdValue;
      } else if (fm.thresholdType === 'pain') {
        achieved = currentVal <= fm.thresholdValue;
      } else if (fm.thresholdType === 'sling') {
        achieved = currentVal >= fm.thresholdValue;
      } else if (fm.thresholdType === 'function') {
        achieved = currentVal >= (10 - fm.thresholdValue);
      }
      if (achieved && !fm.achieved) {
        fm.achieved = true;
        fm.triggeredAtSession = s;
        milestones.push({
          week: Math.round(dayOffset / 7),
          label: fm.label,
          criteria: fm.description,
          type: 'risk_reduction',
        });
      }
    }

    let sessRisk: number;
    let sessSling: number;
    let sessPain: number;

    if (scenarios.length === 0) {
      const prev = sessions[sessions.length - 1];
      sessRisk = prev?.riskScore ?? startingRisk;
      sessSling = prev?.slingIntegrity ?? startingSlingIntegrity;
      sessPain = prev?.painPrediction ?? startingRisk * 0.8;

      if (interSessionHealing) {
        sessRisk = clamp(sessRisk - interSessionHealing.netHealingDelta, 0, 100);
      }

      const riskDeltaEmpty = prevRisk - sessRisk;
      if (riskDeltaEmpty < 1 && s > 3) {
        plateauCount++;
      } else {
        plateauCount = 0;
      }
      prevRisk = sessRisk;

      sessions.push({
        sessionNumber: s,
        dayOffset,
        treatments: sessionTreatments,
        riskScore: Math.round(sessRisk),
        riskLevel: getRiskLevelFromScore(sessRisk),
        painPrediction: Math.round(avgPain * 10),
        slingIntegrity: Math.round(avgSlingIntegrity),
        forceReduction: prev?.forceReduction ?? 0,
        compensationResolution: prev?.compensationResolution ?? 0,
        doseResponseFraction: 0,
        activeScenarios: scenarios,
        modelConfig: prev?.modelConfig ?? JSON.parse(JSON.stringify(baseModelConfig)),
        overrides: prev?.overrides ?? JSON.parse(JSON.stringify(baseOverrides)),
        forceMultiplier: prev?.forceMultiplier ?? 1.0,
        romPredictions: sessionRomPredictions,
        painMarkerPredictions: sessionPainPredictions,
        muscleStatePredictions: sessionMusclePredictions,
        slingPredictions: sessionSlingPredictions,
        posturalPredictions: sessionPosturalPredictions,
        compensationPredictions: sessionCompPredictions,
        functionalMilestones: funcMilestones.map(fm => ({ ...fm })),
        interSessionHealing,
        recoveryPhaseLabel: nonLinear.phaseLabel,
        isPlateauSession: nonLinear.isPlateauSession,
        isBreakthroughSession: nonLinear.isBreakthroughSession,
        isSetbackSession: nonLinear.isSetbackSession,
      });
      continue;
    }

    const { modelConfig: sessConfig, overrides: sessOverrides, forceMultiplier } = applyScenarios(
      baseModelConfig, baseOverrides, scenarios, appliedMuscles
    );

    sessRisk = startingRisk;
    sessSling = startingSlingIntegrity;
    sessPain = startingRisk * 0.8;
    try {
      const sessComparison = computeWhatIfComparison(
        baseModelConfig, baseOverrides, painMarkers, bodyWeightKg,
        scenarios, appliedMuscles, biomechanicsOutput
      );
      sessRisk = sessComparison.overallRiskAfter;
      sessSling = sessComparison.forceTransferScoreAfter;
      sessPain = sessComparison.painPredictions.length > 0
        ? sessComparison.painPredictions.reduce((sum, p) => sum + p.afterLikelihood, 0) / sessComparison.painPredictions.length
        : sessRisk * 0.7;
    } catch {
      const prev = sessions[sessions.length - 1];
      if (prev) {
        sessRisk = prev.riskScore;
        sessSling = prev.slingIntegrity;
        sessPain = prev.painPrediction;
      }
    }

    if (pm) {
      const sessionFraction = s / totalSessions;
      const healingBoost = (1 - pm.healingRateMultiplier) * sessionFraction * 15;
      sessRisk = clamp(sessRisk + healingBoost, 0, 100);
      sessPain = clamp(sessPain * pm.painSensitivityMultiplier, 0, 100);
      const romCap = pm.romCeilingAdjustment * conditionPhaseRomCeiling;
      sessSling = clamp(sessSling * romCap, 0, 100);
      const recoveryDelta = (pm.interSessionHealingMultiplier - 1) * sessionFraction * 10;
      sessRisk = clamp(sessRisk - recoveryDelta, 0, 100);
    } else if (cp) {
      sessSling = clamp(sessSling * conditionPhaseRomCeiling, 0, 100);
    }

    if (interSessionHealing) {
      sessRisk = clamp(sessRisk - interSessionHealing.netHealingDelta, 0, 100);
    }

    const forceReduction = (1 - forceMultiplier) * 100;
    const avgDose = scenarios.length > 0
      ? scenarios.reduce((sum, sc) => {
          const key = `${sc.target}_${sc.interventionType}`;
          const cumCount = treatmentSessionCounts.get(key) ?? 1;
          const raw = getSessionDoseResponse(cumCount, totalSessions, sc.interventionType);
          return sum + (pm ? raw * pm.perSessionDoseScale : raw);
        }, 0) / scenarios.length
      : 0;
    const compensationResolution = avgDose * 60;

    const riskDelta = prevRisk - sessRisk;
    if (riskDelta < 1 && s > 3) {
      plateauCount++;
    } else {
      plateauCount = 0;
    }

    if (plateauCount >= 3) {
      modifications.push({
        sessionNumber: s,
        type: 'plateau',
        message: `Progress has plateaued — risk score unchanged for ${plateauCount} sessions`,
        suggestion: 'Consider increasing exercise intensity, adding new movement patterns, or progressing to more challenging variations',
      });
      plateauCount = 0;
    }

    if (nonLinear.isSetbackSession || sessRisk > prevRisk + 5) {
      const isLoadBased = loadExceedsIrritability;
      modifications.push({
        sessionNumber: s,
        type: 'regress',
        message: isLoadBased
          ? `Cumulative load (${Math.round(cumulativeLoadIntensity)}) exceeds irritability tolerance (${Math.round(irritabilityThreshold * s * 0.7)}) — tissue overload setback`
          : nonLinear.isSetbackSession
          ? `Early-phase setback — tissue sensitivity exceeds tolerance`
          : `Risk score increased from ${Math.round(prevRisk)} to ${Math.round(sessRisk)}`,
        suggestion: isLoadBased
          ? 'Reduce treatment volume or intensity; allow additional rest days between sessions'
          : 'Consider reducing load, checking for overtraining, or reviewing exercise form and technique',
      });
    }

    if (nonLinear.isBreakthroughSession) {
      modifications.push({
        sessionNumber: s,
        type: 'progress',
        message: `Phase transition breakthrough — accelerated recovery potential`,
        suggestion: 'Good time to progress exercise complexity and load',
      });
    }

    if (sessRisk < prevRisk - 10) {
      const newLevel = getRiskLevelFromScore(sessRisk);
      const oldLevel = getRiskLevelFromScore(prevRisk);
      if (newLevel !== oldLevel) {
        milestones.push({
          week: Math.round(dayOffset / 7),
          label: `Risk reduced to ${newLevel} (${Math.round(sessRisk)}) — session ${s}`,
          type: 'risk_reduction',
        });
      }
    }

    if (avgSlingIntegrity > startingSlingIntegrity + 15 && !milestones.some(m => m.type === 'sling_improvement')) {
      milestones.push({
        week: Math.round(dayOffset / 7),
        label: `Sling integrity improved to ${Math.round(avgSlingIntegrity)}%`,
        type: 'sling_improvement',
      });
    }

    if (avgPain < (painBaselines[0]?.baselineSeverity ?? 5) * 0.5 && !milestones.some(m => m.type === 'pain_milestone')) {
      milestones.push({
        week: Math.round(dayOffset / 7),
        label: `Significant pain reduction predicted`,
        type: 'pain_milestone',
      });
    }

    const sessionThird = totalSessions / 3;
    if (s === Math.round(sessionThird) || s === Math.round(sessionThird * 2)) {
      modifications.push({
        sessionNumber: s,
        type: 'progress',
        message: `Checkpoint: ${Math.round((s / totalSessions) * 100)}% through program`,
        suggestion: s <= sessionThird
          ? 'Consider progressing load and complexity if patient is tolerating well'
          : 'Consider transitioning to more functional, sport-specific exercises',
      });
    }

    prevRisk = sessRisk;

    sessions.push({
      sessionNumber: s,
      dayOffset,
      treatments: sessionTreatments,
      riskScore: Math.round(clamp(sessRisk, 0, 100)),
      riskLevel: getRiskLevelFromScore(sessRisk),
      painPrediction: Math.round(clamp(avgPain * 10, 0, 100)),
      slingIntegrity: Math.round(clamp(avgSlingIntegrity, 0, 100)),
      forceReduction: Math.round(forceReduction * 10) / 10,
      compensationResolution: Math.round(compensationResolution * 10) / 10,
      doseResponseFraction: avgDose,
      activeScenarios: scenarios,
      modelConfig: sessConfig as Record<string, Record<string, number>>,
      overrides: sessOverrides,
      forceMultiplier,
      romPredictions: sessionRomPredictions,
      painMarkerPredictions: sessionPainPredictions,
      muscleStatePredictions: sessionMusclePredictions,
      slingPredictions: sessionSlingPredictions,
      posturalPredictions: sessionPosturalPredictions,
      compensationPredictions: sessionCompPredictions,
      functionalMilestones: funcMilestones.map(fm => ({ ...fm })),
      interSessionHealing,
      recoveryPhaseLabel: nonLinear.phaseLabel,
      isPlateauSession: nonLinear.isPlateauSession,
      isBreakthroughSession: nonLinear.isBreakthroughSession,
      isSetbackSession: nonLinear.isSetbackSession,
    });
  }

  let correctionFactors: CorrectionFactors | undefined;
  const oc = actualOutcomes ?? [];

  if (oc.length > 0) {
    correctionFactors = computeEWMACorrectionFactors(sessions, oc);
    const maxRecordedSession = Math.max(...oc.map(o => o.sessionNumber));

    for (const snap of sessions) {
      if (snap.sessionNumber <= maxRecordedSession) continue;

      const romCorr = correctionFactors.overall.correctionMultiplier;
      const complianceMod = correctionFactors.compliance;

      for (const rp of snap.romPredictions) {
        const jointCorr = correctionFactors.rom[rp.jointId]?.correctionMultiplier ?? romCorr;
        const correctedPred = rp.currentDegrees + (rp.predictedDegrees - rp.currentDegrees) * jointCorr * complianceMod;
        rp.predictedDegrees = Math.round(clamp(correctedPred, 0, rp.targetDegrees) * 10) / 10;
        rp.deltaFromBaseline = Math.round((rp.predictedDegrees - rp.currentDegrees) * 10) / 10;
      }

      for (const pp of snap.painMarkerPredictions) {
        const painCorr = correctionFactors.pain[pp.markerId]?.correctionMultiplier ?? romCorr;
        const painInvCorr = painCorr > 0 ? 1 / painCorr : 1;
        const correctedPred = pp.baselineSeverity + (pp.predictedSeverity - pp.baselineSeverity) * painInvCorr * complianceMod;
        pp.predictedSeverity = Math.round(clamp(correctedPred, 0, 10) * 10) / 10;
        pp.deltaFromBaseline = Math.round((pp.predictedSeverity - pp.baselineSeverity) * 10) / 10;
      }

      for (const mp of snap.muscleStatePredictions) {
        const muscleCorr = correctionFactors.muscle[mp.muscleId]?.correctionMultiplier ?? romCorr;
        const correctedPred = mp.baselineTension + (mp.predictedTension - mp.baselineTension) * muscleCorr * complianceMod;
        mp.predictedTension = Math.round(clamp(correctedPred, 10, 90));
      }

      const riskAdjust = (1 - correctionFactors.overall.correctionMultiplier) * 10;
      snap.riskScore = Math.round(clamp(snap.riskScore + riskAdjust, 0, 100));
      snap.riskLevel = getRiskLevelFromScore(snap.riskScore);

      if (snap.painMarkerPredictions.length > 0) {
        const avgPainCorrected = snap.painMarkerPredictions.reduce((s, p) => s + p.predictedSeverity, 0) / snap.painMarkerPredictions.length;
        snap.painPrediction = Math.round(clamp(avgPainCorrected * 10, 0, 100));
      }

      snap.doseResponseFraction = clamp(snap.doseResponseFraction * correctionFactors.overall.correctionMultiplier, 0, 1);

      if (snap.interSessionHealing) {
        const healCorr = correctionFactors.overall.correctionMultiplier;
        snap.interSessionHealing = {
          ...snap.interSessionHealing,
          tissueRemodeling: snap.interSessionHealing.tissueRemodeling * healCorr,
          exerciseCarryOver: snap.interSessionHealing.exerciseCarryOver * healCorr,
          inflammationResolution: snap.interSessionHealing.inflammationResolution * healCorr,
          netHealingDelta: snap.interSessionHealing.netHealingDelta * healCorr,
        };
      }

      for (const sp of snap.slingPredictions) {
        const slingCorr = correctionFactors.overall.correctionMultiplier;
        const correctedIntegrity = sp.baselineIntegrity + (sp.predictedIntegrity - sp.baselineIntegrity) * slingCorr * complianceMod;
        sp.predictedIntegrity = Math.round(clamp(correctedIntegrity, 0, 100));
        sp.deltaFromBaseline = Math.round(sp.predictedIntegrity - sp.baselineIntegrity);
      }

      const corrOverall = correctionFactors.overall.correctionMultiplier;
      const sessionFrac = snap.sessionNumber / sessions.length;
      if (corrOverall > 1.1 && sessionFrac > 0.5) {
        const phaseLabels = ['Acute/Protective', 'Proliferative', 'Remodeling', 'Functional', 'Return to Activity'];
        const currentIdx = phaseLabels.indexOf(snap.recoveryPhaseLabel ?? '');
        if (currentIdx >= 0 && currentIdx < phaseLabels.length - 1) {
          const advancement = (corrOverall - 1) * sessionFrac;
          if (advancement > 0.15) {
            snap.recoveryPhaseLabel = phaseLabels[Math.min(currentIdx + 1, phaseLabels.length - 1)];
          }
        }
      } else if (corrOverall < 0.9 && sessionFrac > 0.3) {
        const phaseLabels = ['Acute/Protective', 'Proliferative', 'Remodeling', 'Functional', 'Return to Activity'];
        const currentIdx = phaseLabels.indexOf(snap.recoveryPhaseLabel ?? '');
        if (currentIdx > 0) {
          const regression = (1 - corrOverall) * sessionFrac;
          if (regression > 0.15) {
            snap.recoveryPhaseLabel = phaseLabels[Math.max(currentIdx - 1, 0)];
          }
        }
      }
    }
  }

  const lastSession = sessions[sessions.length - 1];
  const estimatedRecoverySessions = (() => {
    for (const snap of sessions) {
      if (snap.riskScore <= 25) return snap.sessionNumber;
    }
    return totalSessions;
  })();

  return {
    sessions,
    totalSessions,
    totalDays,
    sessionIntervalDays,
    treatments,
    modifications,
    baseline,
    startingState: {
      riskScore: Math.round(startingRisk),
      riskLevel: getRiskLevelFromScore(startingRisk),
      slingIntegrity: Math.round(startingSlingIntegrity),
      painBaseline: Math.round(startingRisk * 0.8),
    },
    endState: {
      riskScore: lastSession?.riskScore ?? Math.round(startingRisk),
      riskLevel: lastSession?.riskLevel ?? getRiskLevelFromScore(startingRisk),
      slingIntegrity: lastSession?.slingIntegrity ?? Math.round(startingSlingIntegrity),
      estimatedRecoverySessions,
    },
    milestones: milestones.sort((a, b) => a.week - b.week),
    functionalMilestones: funcMilestones,
    correctionFactors,
    actualOutcomes: oc.length > 0 ? oc : undefined,
  };
}

const PHASE_TREATMENT_GOALS: Record<string, string> = {
  'Acute/Protective': 'Pain management, gentle isometric loading below pain threshold, activity modification, education. Avoid aggressive loading or end-range stretching.',
  'Proliferative': 'Progressive loading, motor control re-education, early strengthening in mid-range, controlled mobility. Begin to restore functional movement patterns.',
  'Remodeling': 'Tissue remodeling through graded exposure, increased resistance, eccentric loading, full-range functional movements. Build load tolerance and endurance.',
  'Functional': 'Sport/task-specific movements, power development, agility drills, dynamic stability challenges. Integrate multi-planar functional patterns.',
  'Return to Activity': 'Full return to sport/work demands, plyometrics, high-velocity training, advanced proprioception. Injury prevention and maintenance programming.',
};

function synthesizeReQueryPayload(
  snapshot: SessionSnapshot,
  phaseLabel: string,
  previousExercises: CustomExercise[],
  previousTechniques: CustomTechnique[],
  correctionFactors?: CorrectionFactors,
): {
  exercisePayload: Record<string, unknown>;
  techniquePayload: Record<string, unknown>;
} {
  const avgRomPct = snapshot.romPredictions.length > 0
    ? snapshot.romPredictions.reduce((s, r) => s + (r.targetDegrees > 0 ? (r.predictedDegrees / r.targetDegrees) * 100 : 50), 0) / snapshot.romPredictions.length
    : 50;
  const avgPain = snapshot.painMarkerPredictions.length > 0
    ? snapshot.painMarkerPredictions.reduce((s, p) => s + p.predictedSeverity, 0) / snapshot.painMarkerPredictions.length
    : 5;
  const avgSling = snapshot.slingPredictions.length > 0
    ? snapshot.slingPredictions.reduce((s, sl) => s + sl.predictedIntegrity, 0) / snapshot.slingPredictions.length
    : 50;
  const avgCompRes = snapshot.compensationPredictions.length > 0
    ? snapshot.compensationPredictions.reduce((s, c) => s + c.resolutionPercent, 0) / snapshot.compensationPredictions.length
    : 0;

  const achievedMilestones = snapshot.functionalMilestones
    .filter(m => m.achieved)
    .map(m => m.label);

  const phaseGoals = PHASE_TREATMENT_GOALS[phaseLabel] ?? PHASE_TREATMENT_GOALS['Remodeling'];

  const prevProgressionContext = previousExercises.map(ex => {
    const stages = (ex.progressionStages ?? []).map(s => `Stage ${s.stage} (${s.name}): ${s.description}`).join('; ');
    return `- ${ex.name} [${ex.targetSystem}]: ${stages}`;
  }).join('\n');

  const prevTechniqueContext = previousTechniques.map(t => {
    const stages = (t.progressionStages ?? []).map(s => `Stage ${s.stage} (${s.name}): ${s.description}`).join('; ');
    return `- ${t.name} [${t.targetSystem}]: ${stages}`;
  }).join('\n');

  let correctionContext = '';
  if (correctionFactors) {
    const trend = correctionFactors.overall.trend;
    const mag = correctionFactors.overall.magnitude;
    correctionContext = `\nPATIENT RESPONSE CORRECTION: Patient is responding ${trend === 'faster' ? `${mag}% faster` : trend === 'slower' ? `${mag}% slower` : 'as expected'} compared to predictions. ${trend === 'faster' ? 'Consider more aggressive progression.' : trend === 'slower' ? 'Consider gentler progression with longer adaptation periods.' : ''}`;
  }

  const painMarkers = snapshot.painMarkerPredictions.map(p => ({
    label: p.markerLabel,
    severity: p.predictedSeverity,
    type: 'predicted' as const,
  }));

  const slingData = {
    systemSummary: `Predicted state at session ${snapshot.sessionNumber}: average sling integrity ${Math.round(avgSling)}%`,
    overallForceTransferScore: Math.round(avgSling),
    slings: snapshot.slingPredictions.map(sp => ({
      label: sp.slingName,
      status: sp.predictedIntegrity >= 70 ? 'good' : sp.predictedIntegrity >= 40 ? 'compromised' : 'dysfunctional',
      activationScore: sp.predictedIntegrity,
      forceTransferQuality: sp.predictedIntegrity >= 70 ? 'good' : sp.predictedIntegrity >= 40 ? 'moderate' : 'poor',
      weakLinks: sp.weakLinks.map(w => ({ muscle: w, activationPct: Math.round(sp.predictedIntegrity * 0.6), reason: 'Predicted remaining weak link' })),
      forceReroutes: [] as Array<{ fromMuscle: string; toMuscle: string; reroutePct: number; clinical: string }>,
      treatmentTargets: [] as Array<{ muscle: string; intervention: string; rationale: string }>,
      narrative: `Predicted integrity: ${sp.predictedIntegrity}% (${sp.deltaFromBaseline > 0 ? '+' : ''}${sp.deltaFromBaseline}% from baseline)`,
    })),
  };

  const compensationCards = snapshot.compensationPredictions
    .filter(c => c.resolutionPercent < 80)
    .map(c => ({
      title: c.patternName,
      description: `${Math.round(c.resolutionPercent)}% resolved, predicted severity: ${c.predictedSeverity}`,
      severity: c.predictedSeverity > 5 ? 'high' : c.predictedSeverity > 2 ? 'moderate' : 'low',
    }));

  const kineticChainDysfunctions = snapshot.muscleStatePredictions
    .filter(m => m.trendDirection === 'worsening' || m.predictedTension > 70 || m.predictedTension < 30)
    .map(m => ({
      chain: m.muscleId,
      dysfunction: m.predictedTension > 70 ? 'Hypertonic' : m.predictedTension < 30 ? 'Inhibited' : 'Abnormal tone',
      clinical: m.clinicalNote,
    }));

  const targetFocusBase = `PHASE TRANSITION TO: ${phaseLabel}\n\nPHASE-SPECIFIC TREATMENT GOALS:\n${phaseGoals}\n\nPREDICTED PATIENT STATE AT THIS POINT:\n- Pain: ${avgPain.toFixed(1)}/10\n- ROM recovery: ${avgRomPct.toFixed(0)}%\n- Sling integrity: ${avgSling.toFixed(0)}%\n- Compensation resolution: ${avgCompRes.toFixed(0)}%\n- Risk score: ${snapshot.riskScore}\n- Achieved milestones: ${achievedMilestones.length > 0 ? achievedMilestones.join(', ') : 'None yet'}${correctionContext}`;

  const exerciseTargetFocus = `${targetFocusBase}\n\nPREVIOUS EXERCISE PROGRAM (being retired):\n${prevProgressionContext || 'None'}\n\nDesign NEW exercises appropriate for the ${phaseLabel} phase. These should BUILD on the gains from the previous phase while progressing toward the phase goals listed above. Consider where each previous exercise left off (see progression stages) and design the next level of challenge.`;

  const techniqueTargetFocus = `${targetFocusBase}\n\nPREVIOUS MANUAL THERAPY PROGRAM (being retired):\n${prevTechniqueContext || 'None'}\n\nDesign NEW manual therapy techniques appropriate for the ${phaseLabel} phase. These should address remaining tissue restrictions while matching the phase goals listed above.`;

  const exercisePayload = {
    targetFocus: exerciseTargetFocus,
    mechanismSummary: `Predicted state at session ${snapshot.sessionNumber}, transitioning to ${phaseLabel} phase`,
    causalChains: [] as unknown[],
    compensationCards,
    loadRedistribution: [] as unknown[],
    slingData,
    painMarkers,
    topContributors: snapshot.muscleStatePredictions
      .filter(m => m.trendDirection === 'worsening')
      .map(m => `${m.muscleId} (${m.clinicalNote})`),
    kineticChainDysfunctions,
  };

  const techniquePayload = {
    targetFocus: techniqueTargetFocus,
    mechanismSummary: `Predicted state at session ${snapshot.sessionNumber}, transitioning to ${phaseLabel} phase`,
    causalChains: [] as unknown[],
    compensationCards,
    loadRedistribution: [] as unknown[],
    slingData,
    painMarkers,
    topContributors: snapshot.muscleStatePredictions
      .filter(m => m.trendDirection === 'worsening')
      .map(m => `${m.muscleId} (${m.clinicalNote})`),
    kineticChainDysfunctions,
    scarMarkers: [] as unknown[],
    adhesionBands: [] as unknown[],
    musclePathologies: [] as unknown[],
  };

  return { exercisePayload, techniquePayload };
}

function detectPhaseTransitions(sessions: SessionSnapshot[]): Array<{ sessionIndex: number; fromPhase: string; toPhase: string }> {
  const transitions: Array<{ sessionIndex: number; fromPhase: string; toPhase: string }> = [];
  for (let i = 1; i < sessions.length; i++) {
    const prev = sessions[i - 1].recoveryPhaseLabel;
    const curr = sessions[i].recoveryPhaseLabel;
    if (prev && curr && prev !== curr) {
      transitions.push({ sessionIndex: i, fromPhase: prev, toPhase: curr });
    }
  }
  return transitions;
}

export async function buildSessionTimelineAsync(
  customExercises: CustomExercise[],
  customTechniques: CustomTechnique[],
  baseModelConfig: Record<string, Record<string, number>>,
  baseOverrides: Record<string, Partial<MuscleOverride>>,
  painMarkers: Array<{ id: string; position: { x: number; y: number; z: number }; label: string; type: 'point' | 'area' | 'referred' | 'line' | 'paint'; severity?: number; description?: string }>,
  bodyWeightKg: number,
  biomechanicsOutput?: unknown | null,
  patientModifiers?: PatientModifierProfile | null,
  conditionProfile?: ConditionRecoveryProfile | null,
  actualOutcomes?: ActualSessionOutcome[],
  onPhaseProgress?: (event: PhaseProgressEvent) => void,
  signal?: AbortSignal,
  onPartialResult?: (partial: SessionTimelineResult) => void,
): Promise<SessionTimelineResult> {
  onPhaseProgress?.({ phaseIndex: 0, phaseLabel: 'Initial', status: 'building', message: 'Building initial timeline with current treatments...' });

  const initialResult = buildSessionTimeline(
    customExercises, customTechniques, baseModelConfig, baseOverrides,
    painMarkers, bodyWeightKg, biomechanicsOutput, patientModifiers, conditionProfile, actualOutcomes,
  );

  const transitions = detectPhaseTransitions(initialResult.sessions);

  if (transitions.length === 0) {
    const singlePhase: TreatmentPhaseBlock = {
      phaseLabel: initialResult.sessions[0]?.recoveryPhaseLabel ?? 'Initial',
      phaseIndex: 0,
      startSession: 1,
      endSession: initialResult.totalSessions,
      exercises: customExercises,
      techniques: customTechniques,
      designRationale: 'Initial treatment design — no phase transitions detected',
      safetyNotes: '',
      predictedStateAtTransition: null,
      phaseGoals: PHASE_TREATMENT_GOALS[initialResult.sessions[0]?.recoveryPhaseLabel ?? 'Remodeling'] ?? '',
      previousProgressionStages: [],
    };
    const singleResult = { ...initialResult, treatmentPhases: [singlePhase] };
    onPhaseProgress?.({ phaseIndex: 0, phaseLabel: singlePhase.phaseLabel, status: 'complete', message: 'Timeline complete — single phase' });
    onPartialResult?.(singleResult);
    return singleResult;
  }

  const treatmentPhases: TreatmentPhaseBlock[] = [];
  let currentExercises = customExercises;
  let currentTechniques = customTechniques;
  let accumulatedResult = initialResult;

  const firstTransitionSession = transitions[0].sessionIndex;
  const firstPhaseEndSession = accumulatedResult.sessions[firstTransitionSession]?.sessionNumber
    ? accumulatedResult.sessions[firstTransitionSession].sessionNumber - 1
    : firstTransitionSession;
  treatmentPhases.push({
    phaseLabel: transitions[0].fromPhase,
    phaseIndex: 0,
    startSession: 1,
    endSession: firstPhaseEndSession,
    exercises: currentExercises,
    techniques: currentTechniques,
    designRationale: 'Initial treatment design by practitioner',
    safetyNotes: '',
    predictedStateAtTransition: null,
    phaseGoals: PHASE_TREATMENT_GOALS[transitions[0].fromPhase] ?? '',
    previousProgressionStages: [],
  });

  const firstPhaseSessions = accumulatedResult.sessions.filter(s => s.sessionNumber <= firstPhaseEndSession);
  onPartialResult?.({
    ...accumulatedResult,
    sessions: firstPhaseSessions,
    totalSessions: firstPhaseSessions.length,
    treatmentPhases: [...treatmentPhases],
  });

  for (let ti = 0; ti < transitions.length; ti++) {
    if (signal?.aborted) break;

    const transition = transitions[ti];
    const transitionSnap = accumulatedResult.sessions[transition.sessionIndex];
    if (!transitionSnap) continue;

    onPhaseProgress?.({
      phaseIndex: ti + 1,
      phaseLabel: transition.toPhase,
      status: 'requerying',
      message: `Generating ${transition.toPhase} phase treatments...`,
    });

    const prevProgressionStages = [
      ...currentExercises.map(ex => ({
        exerciseName: ex.name,
        stages: (ex.progressionStages ?? []).map(s => ({ stage: s.stage, name: s.name, description: s.description })),
      })),
      ...currentTechniques.map(t => ({
        exerciseName: t.name,
        stages: (t.progressionStages ?? []).map(s => ({ stage: s.stage, name: s.name, description: s.description })),
      })),
    ];

    const { exercisePayload, techniquePayload } = synthesizeReQueryPayload(
      transitionSnap,
      transition.toPhase,
      currentExercises,
      currentTechniques,
      accumulatedResult.correctionFactors,
    );

    const avgRomPct = transitionSnap.romPredictions.length > 0
      ? transitionSnap.romPredictions.reduce((s, r) => s + (r.targetDegrees > 0 ? (r.predictedDegrees / r.targetDegrees) * 100 : 50), 0) / transitionSnap.romPredictions.length
      : 50;
    const avgPain = transitionSnap.painMarkerPredictions.length > 0
      ? transitionSnap.painMarkerPredictions.reduce((s, p) => s + p.predictedSeverity, 0) / transitionSnap.painMarkerPredictions.length
      : 5;
    const avgSling = transitionSnap.slingPredictions.length > 0
      ? transitionSnap.slingPredictions.reduce((s, sl) => s + sl.predictedIntegrity, 0) / transitionSnap.slingPredictions.length
      : 50;
    const avgCompRes = transitionSnap.compensationPredictions.length > 0
      ? transitionSnap.compensationPredictions.reduce((s, c) => s + c.resolutionPercent, 0) / transitionSnap.compensationPredictions.length
      : 0;

    const previousPhaseExercises = currentExercises;
    const previousPhaseTechniques = currentTechniques;
    let newExercises: CustomExercise[] = currentExercises;
    let newTechniques: CustomTechnique[] = currentTechniques;
    let exerciseRationale = '';
    let exerciseSafety = '';
    let techniqueRationale = '';
    let treatmentsChanged = false;

    try {
      const { apiRequest } = await import('@/lib/queryClient');

      const [exResponse, mtResponse] = await Promise.all([
        apiRequest('/api/exercise-engine/design-custom', 'POST', exercisePayload)
          .catch(() => null),
        apiRequest('/api/manual-therapy-engine/design-custom', 'POST', techniquePayload)
          .catch(() => null),
      ]);

      if (exResponse?.customExercises && Array.isArray(exResponse.customExercises) && exResponse.customExercises.length > 0) {
        newExercises = exResponse.customExercises;
        exerciseRationale = exResponse.designRationale ?? '';
        exerciseSafety = exResponse.safetyNotes ?? '';
        treatmentsChanged = true;
      }

      if (mtResponse?.customTechniques && Array.isArray(mtResponse.customTechniques) && mtResponse.customTechniques.length > 0) {
        newTechniques = mtResponse.customTechniques;
        techniqueRationale = mtResponse.designRationale ?? '';
        treatmentsChanged = true;
      }
    } catch (err) {
      console.warn(`[SessionTimeline] Re-query failed for phase ${transition.toPhase}:`, err);
    }

    const nextTransitionSessionNum = ti + 1 < transitions.length
      ? accumulatedResult.sessions[transitions[ti + 1].sessionIndex]?.sessionNumber ?? accumulatedResult.totalSessions
      : accumulatedResult.totalSessions;
    const phaseEndSession = ti + 1 < transitions.length ? nextTransitionSessionNum - 1 : nextTransitionSessionNum;

    treatmentPhases.push({
      phaseLabel: transition.toPhase,
      phaseIndex: ti + 1,
      startSession: transitionSnap.sessionNumber,
      endSession: phaseEndSession,
      exercises: newExercises,
      techniques: newTechniques,
      designRationale: [exerciseRationale, techniqueRationale].filter(Boolean).join('\n\n') || `AI-generated treatments for ${transition.toPhase} phase`,
      safetyNotes: exerciseSafety,
      predictedStateAtTransition: {
        avgPain: Math.round(avgPain * 10) / 10,
        avgRomPercent: Math.round(avgRomPct),
        avgSlingIntegrity: Math.round(avgSling),
        avgCompensationResolution: Math.round(avgCompRes),
        riskScore: transitionSnap.riskScore,
        achievedMilestones: transitionSnap.functionalMilestones.filter(m => m.achieved).map(m => m.label),
        correctionTrend: accumulatedResult.correctionFactors?.overall.trend,
      },
      phaseGoals: PHASE_TREATMENT_GOALS[transition.toPhase] ?? '',
      previousProgressionStages: prevProgressionStages,
    });

    currentExercises = newExercises;
    currentTechniques = newTechniques;

    if (treatmentsChanged) {
      onPhaseProgress?.({
        phaseIndex: ti + 1,
        phaseLabel: transition.toPhase,
        status: 'building',
        message: `Rebuilding timeline from session ${transitionSnap.sessionNumber} with new treatments...`,
      });

      const rebuiltResult = buildSessionTimeline(
        newExercises, newTechniques, baseModelConfig, baseOverrides,
        painMarkers, bodyWeightKg, biomechanicsOutput, patientModifiers, conditionProfile, actualOutcomes,
      );

      const transitionSessionNum = transitionSnap.sessionNumber;
      const preTransitionSessions = accumulatedResult.sessions.filter(s => s.sessionNumber < transitionSessionNum);
      const postTransitionSessions = rebuiltResult.sessions
        .filter(s => s.sessionNumber >= transitionSessionNum)
        .map(s => ({ ...s }));

      accumulatedResult = {
        ...accumulatedResult,
        sessions: [...preTransitionSessions, ...postTransitionSessions],
        treatments: [...accumulatedResult.treatments.filter(t => {
          return preTransitionSessions.some(ps => ps.treatments.some(pt => pt.name === t.name));
        }), ...rebuiltResult.treatments],
        milestones: [
          ...accumulatedResult.milestones.filter(m => {
            const weekDay = m.week * 7;
            return weekDay < (transitionSessionNum - 1) * accumulatedResult.sessionIntervalDays;
          }),
          ...rebuiltResult.milestones,
        ],
        modifications: [
          ...accumulatedResult.modifications.filter(m => m.sessionNumber < transitionSessionNum),
          ...rebuiltResult.modifications.filter(m => m.sessionNumber >= transitionSessionNum),
        ],
        endState: rebuiltResult.endState,
        correctionFactors: rebuiltResult.correctionFactors ?? accumulatedResult.correctionFactors,
      };

      const updatedTransitions = detectPhaseTransitions(accumulatedResult.sessions);
      for (let uti = ti + 1; uti < transitions.length; uti++) {
        const oldTransition = transitions[uti];
        const matching = updatedTransitions.find(ut => ut.toPhase === oldTransition.toPhase);
        if (matching) {
          transitions[uti] = matching;
        }
      }
    }

    onPhaseProgress?.({
      phaseIndex: ti + 1,
      phaseLabel: transition.toPhase,
      status: 'complete',
      message: `${transition.toPhase} phase treatments ready`,
    });

    const completedPhaseSessions = accumulatedResult.sessions.filter(s => s.sessionNumber <= phaseEndSession);
    onPartialResult?.({
      ...accumulatedResult,
      sessions: completedPhaseSessions,
      totalSessions: completedPhaseSessions.length,
      treatmentPhases: [...treatmentPhases],
    });
  }

  return { ...accumulatedResult, treatmentPhases };
}
