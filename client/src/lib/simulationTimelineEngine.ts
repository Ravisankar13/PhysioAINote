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
): SimulationTimelineResult {
  const phaseRanges = computePhaseWeekRanges(treatmentPlan.phases);
  const totalDuration = phaseRanges.length > 0 ? phaseRanges[phaseRanges.length - 1].endWeek : 12;
  const totalPhases = treatmentPlan.phases.length;

  const simPhases: SimulationPhase[] = phaseRanges.map(({ phase, startWeek, endWeek }) => {
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
      startWeek: startWeek,
      endWeek: endWeek,
      goals: phase.goals,
      activeExercises: exercises,
      activeManualTherapy: manualTherapy,
      advancementCriteria: phase.reviewPoint || `Complete ${endWeek - startWeek} weeks of phase`,
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

    const doseResponse = getDoseResponseFraction(week);

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

      const scaledMagnitude = entry.magnitude * doseResponse * entry.doseScale;
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
}

export interface SessionTimelineResult {
  sessions: SessionSnapshot[];
  totalSessions: number;
  totalDays: number;
  sessionIntervalDays: number;
  treatments: SessionTreatment[];
  modifications: SessionModification[];
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
): SessionTimelineResult {
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

  const totalDurationWeeks = estimateTotalDuration(painMarkers, customExercises.length, customTechniques.length);
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

  const sessions: SessionSnapshot[] = [];
  const milestones: SimulationMilestone[] = [];
  const modifications: SessionModification[] = [];
  let prevRisk = startingRisk;
  let plateauCount = 0;
  const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6', '#10b981', '#ef4444'];

  for (let s = 0; s <= totalSessions; s++) {
    const dayOffset = s * sessionIntervalDays;
    const sessionTreatments: SessionTreatment[] = [];

    for (const t of treatments) {
      const treatmentInterval = parseFrequencyToDaysInterval(t.frequency);
      if (s === 0 || dayOffset % Math.max(1, Math.round(treatmentInterval)) === 0 || treatmentInterval <= sessionIntervalDays) {
        sessionTreatments.push(t);
      }
    }

    const scenarios: WhatIfScenario[] = [];
    const seen = new Set<string>();
    let colorIdx = 0;

    for (const t of treatments) {
      const key = `${t.target}_${t.interventionType}`;
      if (seen.has(key)) {
        const existing = scenarios.find(sc => sc.id.startsWith(`sess_${key}_`));
        if (existing) {
          const doseResp = getSessionDoseResponse(s, totalSessions, t.interventionType);
          existing.magnitude = Math.min(existing.magnitude + t.magnitude * doseResp * 0.3, existing.magnitude * 1.5);
        }
        continue;
      }
      seen.add(key);

      const doseResp = getSessionDoseResponse(s, totalSessions, t.interventionType);
      const scaledMag = t.magnitude * doseResp;
      if (scaledMag < 0.5) continue;

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

    if (s === 0 || scenarios.length === 0) {
      sessions.push({
        sessionNumber: s,
        dayOffset,
        treatments: sessionTreatments,
        riskScore: Math.round(startingRisk),
        riskLevel: getRiskLevelFromScore(startingRisk),
        painPrediction: Math.round(startingRisk * 0.8),
        slingIntegrity: Math.round(startingSlingIntegrity),
        forceReduction: 0,
        compensationResolution: 0,
        doseResponseFraction: 0,
        activeScenarios: scenarios,
        modelConfig: JSON.parse(JSON.stringify(baseModelConfig)),
        overrides: JSON.parse(JSON.stringify(baseOverrides)),
        forceMultiplier: 1.0,
      });
      continue;
    }

    const { modelConfig: sessConfig, overrides: sessOverrides, forceMultiplier } = applyScenarios(
      baseModelConfig, baseOverrides, scenarios, appliedMuscles
    );

    let sessRisk = startingRisk;
    let sessSling = startingSlingIntegrity;
    let sessPain = startingRisk * 0.8;
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

    const forceReduction = (1 - forceMultiplier) * 100;
    const avgDose = scenarios.length > 0
      ? scenarios.reduce((sum, sc) => sum + getSessionDoseResponse(s, totalSessions, sc.interventionType), 0) / scenarios.length
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

    if (sessRisk > prevRisk + 5) {
      modifications.push({
        sessionNumber: s,
        type: 'regress',
        message: `Risk score increased from ${Math.round(prevRisk)} to ${Math.round(sessRisk)}`,
        suggestion: 'Consider reducing load, checking for overtraining, or reviewing exercise form and technique',
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

    if (sessSling > startingSlingIntegrity + 15 && !milestones.some(m => m.type === 'sling_improvement')) {
      milestones.push({
        week: Math.round(dayOffset / 7),
        label: `Sling integrity improved to ${Math.round(sessSling)}%`,
        type: 'sling_improvement',
      });
    }

    if (sessPain < startingRisk * 0.4 && !milestones.some(m => m.type === 'pain_milestone')) {
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
      painPrediction: Math.round(clamp(sessPain, 0, 100)),
      slingIntegrity: Math.round(clamp(sessSling, 0, 100)),
      forceReduction: Math.round(forceReduction * 10) / 10,
      compensationResolution: Math.round(compensationResolution * 10) / 10,
      doseResponseFraction: avgDose,
      activeScenarios: scenarios,
      modelConfig: sessConfig as Record<string, Record<string, number>>,
      overrides: sessOverrides,
      forceMultiplier,
    });
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
  };
}
