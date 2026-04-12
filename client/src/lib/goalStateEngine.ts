import type { ConditionRecoveryProfile, PatientModifierProfile } from './patientFactorsEngine';
import type { SessionSnapshot, RomPrediction } from './simulationTimelineEngine';

export interface ClinicalStateInput {
  painMarkers?: Array<{ boneName: string; intensity: number }>;
  muscleStates?: Array<{ muscleId: string; tension: number }>;
  compensationPatterns?: string[];
  posturalDeviations?: string[];
  slingAnalysis?: Array<{ slingName: string; integrity: number }>;
}

export interface RomGoalTarget {
  jointId: string;
  label: string;
  targetDegrees: number;
  normalDegrees: number;
  recoveryPercent: number;
}

export interface MuscleGoalTarget {
  muscleId: string;
  targetTensionMin: number;
  targetTensionMax: number;
}

export interface SlingGoalTarget {
  slingName: string;
  targetIntegrity: number;
}

export interface FunctionalGoal {
  label: string;
  metric: string;
  targetValue: number;
  unit: string;
}

export interface PostureGoalTarget {
  deviationType: string;
  boneName: string;
  targetAngle: number;
  axis: 'x' | 'y' | 'z';
}

export interface RecoveryGoalProfile {
  conditionId: string;
  conditionName: string;
  romTargets: RomGoalTarget[];
  painTarget: number;
  muscleTensionTargets: MuscleGoalTarget[];
  slingTargets: SlingGoalTarget[];
  postureTargets: PostureGoalTarget[];
  compensationResolutionTarget: number;
  functionalGoals: FunctionalGoal[];
  riskScoreTarget: number;
  strengthTarget: number;
  jointStressTarget: number;
  overallRomRecoveryPercent: number;
}

export interface DimensionGap {
  dimension: string;
  label: string;
  current: number;
  target: number;
  achievementPct: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  trend: 'improving' | 'stalled' | 'worsening' | 'unknown';
}

export interface GoalGapAnalysis {
  timestamp: number;
  sessionNumber: number;
  overallAchievementPct: number;
  dimensions: DimensionGap[];
  priorityDimensions: DimensionGap[];
  romAchievementPct: number;
  painAchievementPct: number;
  slingAchievementPct: number;
  compensationAchievementPct: number;
  muscleTensionAchievementPct: number;
  riskAchievementPct: number;
  goalsMet: boolean;
  estimatedSessionsRemaining: number | null;
  narrative: string;
}

const JOINT_ROM_NORMS: Record<string, { label: string; normalDegrees: number }> = {
  shoulder_flexion: { label: 'Shoulder Flexion', normalDegrees: 180 },
  shoulder_abduction: { label: 'Shoulder Abduction', normalDegrees: 180 },
  shoulder_er: { label: 'Shoulder ER', normalDegrees: 90 },
  shoulder_ir: { label: 'Shoulder IR', normalDegrees: 70 },
  elbow_flexion: { label: 'Elbow Flexion', normalDegrees: 150 },
  hip_flexion: { label: 'Hip Flexion', normalDegrees: 120 },
  hip_abduction: { label: 'Hip Abduction', normalDegrees: 45 },
  hip_er: { label: 'Hip ER', normalDegrees: 45 },
  hip_ir: { label: 'Hip IR', normalDegrees: 35 },
  knee_flexion: { label: 'Knee Flexion', normalDegrees: 140 },
  knee_extension: { label: 'Knee Extension', normalDegrees: 0 },
  ankle_dorsiflexion: { label: 'Ankle DF', normalDegrees: 20 },
  ankle_plantarflexion: { label: 'Ankle PF', normalDegrees: 50 },
  cervical_flexion: { label: 'Cervical Flexion', normalDegrees: 50 },
  cervical_rotation: { label: 'Cervical Rotation', normalDegrees: 80 },
  lumbar_flexion: { label: 'Lumbar Flexion', normalDegrees: 60 },
  lumbar_extension: { label: 'Lumbar Extension', normalDegrees: 25 },
  thoracic_rotation: { label: 'Thoracic Rotation', normalDegrees: 40 },
};

const CONDITION_JOINT_RELEVANCE: Record<string, string[]> = {
  shoulder: ['shoulder_flexion', 'shoulder_abduction', 'shoulder_er', 'shoulder_ir'],
  elbow: ['elbow_flexion'],
  knee: ['knee_flexion', 'knee_extension', 'hip_flexion'],
  hip: ['hip_flexion', 'hip_abduction', 'hip_er', 'hip_ir'],
  ankle: ['ankle_dorsiflexion', 'ankle_plantarflexion'],
  spine: ['lumbar_flexion', 'lumbar_extension', 'cervical_flexion', 'cervical_rotation', 'thoracic_rotation'],
  cervical: ['cervical_flexion', 'cervical_rotation'],
};

const DEFAULT_SLING_NAMES = [
  'Posterior Oblique Sling',
  'Anterior Oblique Sling',
  'Lateral Sling',
  'Deep Longitudinal Sling',
  'Scapular/Shoulder Sling',
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function generateGoalProfile(
  conditionProfile: ConditionRecoveryProfile,
  patientModifiers?: PatientModifierProfile | null,
  existingRomJointIds?: string[],
  clinicalState?: ClinicalStateInput | null,
): RecoveryGoalProfile {
  const romCeilingPct = conditionProfile.expectedRomRecoveryPercent ?? 95;
  const modifiedCeiling = patientModifiers
    ? clamp(romCeilingPct * (patientModifiers.romCeilingAdjustment ?? 1), 50, 100)
    : romCeilingPct;

  const relevantJoints = CONDITION_JOINT_RELEVANCE[conditionProfile.category] ?? [];
  const jointSet = existingRomJointIds && existingRomJointIds.length > 0
    ? existingRomJointIds
    : relevantJoints;

  const romTargets: RomGoalTarget[] = jointSet.map(jointId => {
    const norm = JOINT_ROM_NORMS[jointId];
    if (!norm) {
      return {
        jointId,
        label: jointId.replace(/_/g, ' '),
        targetDegrees: 0,
        normalDegrees: 0,
        recoveryPercent: modifiedCeiling,
      };
    }
    const targetDeg = Math.round(norm.normalDegrees * (modifiedCeiling / 100));
    return {
      jointId,
      label: norm.label,
      targetDegrees: targetDeg,
      normalDegrees: norm.normalDegrees,
      recoveryPercent: modifiedCeiling,
    };
  }).filter(r => r.normalDegrees > 0);

  const painTarget = conditionProfile.recurrenceRiskPercent > 30 ? 10 : 5;

  const slingTargets: SlingGoalTarget[] = DEFAULT_SLING_NAMES.map(name => ({
    slingName: name,
    targetIntegrity: conditionProfile.category === 'shoulder' && name.includes('Scapular') ? 85
      : conditionProfile.category === 'spine' && name.includes('Deep Longitudinal') ? 85
      : 75,
  }));

  const muscleTensionTargets: MuscleGoalTarget[] = buildMuscleTensionTargets(
    conditionProfile, clinicalState
  );

  const functionalGoals: FunctionalGoal[] = buildFunctionalGoals(conditionProfile);

  const riskTarget = 15;

  const compTarget = clinicalState?.compensationPatterns && clinicalState.compensationPatterns.length > 3
    ? 85 : 90;

  const postureTargets: PostureGoalTarget[] = buildPostureTargets(clinicalState);

  const strengthTarget = conditionProfile.category === 'knee' || conditionProfile.category === 'hip'
    ? 80 : conditionProfile.category === 'shoulder' ? 75 : 70;

  const jointStressTarget = conditionProfile.recurrenceRiskPercent > 30 ? 25 : 20;

  return {
    conditionId: conditionProfile.conditionId,
    conditionName: conditionProfile.conditionName,
    romTargets,
    painTarget,
    muscleTensionTargets,
    slingTargets,
    postureTargets,
    compensationResolutionTarget: compTarget,
    functionalGoals,
    riskScoreTarget: riskTarget,
    strengthTarget,
    jointStressTarget,
    overallRomRecoveryPercent: modifiedCeiling,
  };
}

const CONDITION_KEY_MUSCLES: Record<string, string[]> = {
  shoulder: ['deltoid', 'rotator_cuff', 'trapezius', 'pec_major', 'lat_dorsi', 'serratus_anterior'],
  knee: ['quadriceps', 'hamstrings', 'gluteus_maximus', 'gastrocnemius', 'hip_flexors'],
  hip: ['gluteus_maximus', 'gluteus_medius', 'gluteus_minimus', 'piriformis', 'hip_flexors', 'adductors'],
  spine: ['erector_spinae', 'rectus_abdominus', 'obliques', 'multifidus', 'transverse_abdominis'],
  cervical: ['trapezius', 'sternocleidomastoid', 'scalenes', 'deep_neck_flexors'],
  ankle: ['gastrocnemius', 'soleus', 'tibialis_anterior', 'peroneal'],
  elbow: ['biceps', 'triceps', 'forearm_extensors', 'forearm_flexors'],
};

function buildMuscleTensionTargets(
  profile: ConditionRecoveryProfile,
  clinicalState?: ClinicalStateInput | null,
): MuscleGoalTarget[] {
  const targets: MuscleGoalTarget[] = [];
  const keyMuscles = CONDITION_KEY_MUSCLES[profile.category] ?? [];

  const clinicalMuscleIds = clinicalState?.muscleStates?.map(m => m.muscleId) ?? [];
  const allMuscleIdsArr = Array.from(new Set([...keyMuscles, ...clinicalMuscleIds]));

  for (const muscleId of allMuscleIdsArr) {
    const clinicalEntry = clinicalState?.muscleStates?.find(m => m.muscleId === muscleId);

    let targetMin = 35;
    let targetMax = 55;

    if (clinicalEntry) {
      if (clinicalEntry.tension > 70) {
        targetMin = 30;
        targetMax = 50;
      } else if (clinicalEntry.tension < 30) {
        targetMin = 40;
        targetMax = 60;
      }
    }

    targets.push({ muscleId, targetTensionMin: targetMin, targetTensionMax: targetMax });
  }

  return targets;
}

const POSTURE_DEVIATION_MAP: Record<string, { boneName: string; targetAngle: number; axis: 'x' | 'y' | 'z' }> = {
  kyphosis: { boneName: 'Spine2_M', targetAngle: 0, axis: 'x' },
  lordosis: { boneName: 'Spine1_M', targetAngle: 0, axis: 'x' },
  scoliosis: { boneName: 'Spine2_M', targetAngle: 0, axis: 'z' },
  'forward head': { boneName: 'Neck_M', targetAngle: 0, axis: 'x' },
  'head forward': { boneName: 'Neck_M', targetAngle: 0, axis: 'x' },
  'anterior pelvic tilt': { boneName: 'Hip_L', targetAngle: 0, axis: 'x' },
  'posterior pelvic tilt': { boneName: 'Hip_L', targetAngle: 0, axis: 'x' },
  'lateral pelvic tilt': { boneName: 'Hip_L', targetAngle: 0, axis: 'z' },
  'rounded shoulders': { boneName: 'Shoulder_L', targetAngle: 0, axis: 'z' },
  'shoulder elevation': { boneName: 'Shoulder_L', targetAngle: 0, axis: 'y' },
  'knee valgus': { boneName: 'LowerLeg_L', targetAngle: 0, axis: 'z' },
  'knee varus': { boneName: 'LowerLeg_L', targetAngle: 0, axis: 'z' },
  'flat feet': { boneName: 'Foot_L', targetAngle: 0, axis: 'x' },
  'pes planus': { boneName: 'Foot_L', targetAngle: 0, axis: 'x' },
  'trunk rotation': { boneName: 'Spine1_M', targetAngle: 0, axis: 'y' },
};

function buildPostureTargets(clinicalState?: ClinicalStateInput | null): PostureGoalTarget[] {
  if (!clinicalState?.posturalDeviations || clinicalState.posturalDeviations.length === 0) return [];
  const targets: PostureGoalTarget[] = [];
  for (const dev of clinicalState.posturalDeviations) {
    const lower = dev.toLowerCase();
    for (const [key, mapping] of Object.entries(POSTURE_DEVIATION_MAP)) {
      if (lower.includes(key)) {
        targets.push({
          deviationType: dev,
          boneName: mapping.boneName,
          targetAngle: mapping.targetAngle,
          axis: mapping.axis,
        });
        break;
      }
    }
  }
  return targets;
}

function buildFunctionalGoals(profile: ConditionRecoveryProfile): FunctionalGoal[] {
  const goals: FunctionalGoal[] = [];
  const cat = profile.category;

  if (cat === 'shoulder') {
    goals.push({ label: 'Overhead reach', metric: 'shoulder_flexion_rom', targetValue: 170, unit: 'degrees' });
    goals.push({ label: 'Pain-free lifting', metric: 'pain_with_load', targetValue: 0, unit: '/10' });
  } else if (cat === 'knee') {
    goals.push({ label: 'Full squat depth', metric: 'knee_flexion_rom', targetValue: 120, unit: 'degrees' });
    goals.push({ label: 'Single leg balance', metric: 'balance_time', targetValue: 30, unit: 'seconds' });
  } else if (cat === 'spine') {
    goals.push({ label: 'Sit tolerance', metric: 'sitting_tolerance', targetValue: 60, unit: 'minutes' });
    goals.push({ label: 'Pain-free bending', metric: 'pain_with_flexion', targetValue: 0, unit: '/10' });
  } else if (cat === 'hip') {
    goals.push({ label: 'Walking tolerance', metric: 'walking_distance', targetValue: 30, unit: 'minutes' });
    goals.push({ label: 'Stair climbing', metric: 'stair_pain', targetValue: 0, unit: '/10' });
  } else if (cat === 'ankle') {
    goals.push({ label: 'Single leg hop', metric: 'hop_symmetry', targetValue: 90, unit: '%' });
    goals.push({ label: 'Walking without limp', metric: 'gait_symmetry', targetValue: 95, unit: '%' });
  } else if (cat === 'elbow') {
    goals.push({ label: 'Grip strength', metric: 'grip_symmetry', targetValue: 90, unit: '%' });
    goals.push({ label: 'Pain-free gripping', metric: 'grip_pain', targetValue: 0, unit: '/10' });
  }

  return goals;
}

export function computeGoalGap(
  goalProfile: RecoveryGoalProfile,
  snapshot: SessionSnapshot,
  previousSnapshot?: SessionSnapshot | null,
): GoalGapAnalysis {
  const dimensions: DimensionGap[] = [];

  let romAchievement = 100;
  if (goalProfile.romTargets.length > 0 && snapshot.romPredictions.length > 0) {
    const romAchievements: number[] = [];
    for (const target of goalProfile.romTargets) {
      const pred = snapshot.romPredictions.find(r => r.jointId === target.jointId);
      if (pred && target.targetDegrees > 0) {
        const pct = clamp((pred.predictedDegrees / target.targetDegrees) * 100, 0, 100);
        romAchievements.push(pct);

        const prevPred = previousSnapshot?.romPredictions.find(r => r.jointId === target.jointId);
        const prevPct = prevPred && target.targetDegrees > 0
          ? clamp((prevPred.predictedDegrees / target.targetDegrees) * 100, 0, 100)
          : null;

        dimensions.push({
          dimension: `rom_${target.jointId}`,
          label: `ROM: ${target.label}`,
          current: Math.round(pred.predictedDegrees),
          target: target.targetDegrees,
          achievementPct: Math.round(pct),
          gap: Math.round(target.targetDegrees - pred.predictedDegrees),
          priority: pct < 60 ? 'high' : pct < 80 ? 'medium' : 'low',
          trend: prevPct === null ? 'unknown'
            : pct > prevPct + 2 ? 'improving'
            : pct < prevPct - 2 ? 'worsening'
            : 'stalled',
        });
      }
    }
    romAchievement = romAchievements.length > 0
      ? romAchievements.reduce((a, b) => a + b, 0) / romAchievements.length
      : 100;
  }

  const painCurrent = snapshot.painPrediction;
  const painTarget = goalProfile.painTarget;
  const maxPain = 100;
  const painAchievement = painCurrent <= painTarget
    ? 100
    : clamp(((maxPain - painCurrent) / (maxPain - painTarget)) * 100, 0, 100);

  const prevPain = previousSnapshot?.painPrediction ?? null;
  dimensions.push({
    dimension: 'pain',
    label: 'Pain Level',
    current: Math.round(painCurrent),
    target: painTarget,
    achievementPct: Math.round(painAchievement),
    gap: Math.round(painCurrent - painTarget),
    priority: painAchievement < 50 ? 'high' : painAchievement < 75 ? 'medium' : 'low',
    trend: prevPain === null ? 'unknown'
      : painCurrent < prevPain - 3 ? 'improving'
      : painCurrent > prevPain + 3 ? 'worsening'
      : 'stalled',
  });

  let slingAchievement = 100;
  if (goalProfile.slingTargets.length > 0 && snapshot.slingPredictions.length > 0) {
    const slingAchievements: number[] = [];
    for (const target of goalProfile.slingTargets) {
      const pred = snapshot.slingPredictions.find(s =>
        s.slingName.toLowerCase().includes(target.slingName.split(' ')[0].toLowerCase())
      );
      if (pred) {
        const pct = clamp((pred.predictedIntegrity / target.targetIntegrity) * 100, 0, 100);
        slingAchievements.push(pct);

        const prevPred = previousSnapshot?.slingPredictions.find(s =>
          s.slingName.toLowerCase().includes(target.slingName.split(' ')[0].toLowerCase())
        );
        const prevPct = prevPred
          ? clamp((prevPred.predictedIntegrity / target.targetIntegrity) * 100, 0, 100)
          : null;

        dimensions.push({
          dimension: `sling_${target.slingName.replace(/\s+/g, '_').toLowerCase()}`,
          label: `Sling: ${target.slingName}`,
          current: Math.round(pred.predictedIntegrity),
          target: target.targetIntegrity,
          achievementPct: Math.round(pct),
          gap: Math.round(target.targetIntegrity - pred.predictedIntegrity),
          priority: pct < 60 ? 'high' : pct < 80 ? 'medium' : 'low',
          trend: prevPct === null ? 'unknown'
            : pct > prevPct + 2 ? 'improving'
            : pct < prevPct - 2 ? 'worsening'
            : 'stalled',
        });
      }
    }
    slingAchievement = slingAchievements.length > 0
      ? slingAchievements.reduce((a, b) => a + b, 0) / slingAchievements.length
      : 100;
  }

  const compCurrent = snapshot.compensationResolution;
  const compTarget = goalProfile.compensationResolutionTarget;
  const compensationAchievement = compTarget > 0
    ? clamp((compCurrent / compTarget) * 100, 0, 100)
    : 100;

  const prevComp = previousSnapshot?.compensationResolution ?? null;
  dimensions.push({
    dimension: 'compensation',
    label: 'Compensation Resolution',
    current: Math.round(compCurrent),
    target: compTarget,
    achievementPct: Math.round(compensationAchievement),
    gap: Math.round(compTarget - compCurrent),
    priority: compensationAchievement < 50 ? 'high' : compensationAchievement < 75 ? 'medium' : 'low',
    trend: prevComp === null ? 'unknown'
      : compCurrent > prevComp + 2 ? 'improving'
      : compCurrent < prevComp - 2 ? 'worsening'
      : 'stalled',
  });

  let muscleTensionAchievement = 100;
  if (goalProfile.muscleTensionTargets.length > 0 && snapshot.muscleStatePredictions.length > 0) {
    const tensionScores: number[] = [];
    for (const target of goalProfile.muscleTensionTargets) {
      const pred = snapshot.muscleStatePredictions.find(m =>
        m.muscleId.toLowerCase().includes(target.muscleId.toLowerCase()) ||
        target.muscleId.toLowerCase().includes(m.muscleId.toLowerCase())
      );
      if (pred) {
        const midTarget = (target.targetTensionMin + target.targetTensionMax) / 2;
        const range = (target.targetTensionMax - target.targetTensionMin) / 2;
        const deviation = Math.abs(pred.predictedTension - midTarget);
        const score = deviation <= range ? 100 : clamp(100 - (deviation - range) * 3, 0, 100);
        tensionScores.push(score);

        const prevPred = previousSnapshot?.muscleStatePredictions.find(m =>
          m.muscleId.toLowerCase().includes(target.muscleId.toLowerCase()) ||
          target.muscleId.toLowerCase().includes(m.muscleId.toLowerCase())
        );
        const prevDev = prevPred ? Math.abs(prevPred.predictedTension - midTarget) : null;
        const prevScore = prevDev !== null
          ? (prevDev <= range ? 100 : clamp(100 - (prevDev - range) * 3, 0, 100))
          : null;

        dimensions.push({
          dimension: `muscle_${target.muscleId}`,
          label: `Muscle: ${target.muscleId.replace(/_/g, ' ')}`,
          current: Math.round(pred.predictedTension),
          target: Math.round(midTarget),
          achievementPct: Math.round(score),
          gap: Math.round(deviation),
          priority: score < 60 ? 'high' : score < 80 ? 'medium' : 'low',
          trend: prevScore === null ? 'unknown'
            : score > prevScore + 2 ? 'improving'
            : score < prevScore - 2 ? 'worsening'
            : 'stalled',
        });
      }
    }
    muscleTensionAchievement = tensionScores.length > 0
      ? tensionScores.reduce((a, b) => a + b, 0) / tensionScores.length
      : 100;
  } else if (snapshot.muscleStatePredictions.length > 0) {
    const tensionScores: number[] = [];
    for (const msp of snapshot.muscleStatePredictions) {
      const deviation = Math.abs(msp.predictedTension - 50);
      const score = clamp(100 - deviation * 2, 0, 100);
      tensionScores.push(score);
    }
    muscleTensionAchievement = tensionScores.length > 0
      ? tensionScores.reduce((a, b) => a + b, 0) / tensionScores.length
      : 100;
  }

  const riskCurrent = snapshot.riskScore;
  const riskTarget = goalProfile.riskScoreTarget;
  const riskAchievement = riskCurrent <= riskTarget
    ? 100
    : clamp(((100 - riskCurrent) / (100 - riskTarget)) * 100, 0, 100);

  const prevRisk = previousSnapshot?.riskScore ?? null;
  dimensions.push({
    dimension: 'risk',
    label: 'Injury Risk Score',
    current: riskCurrent,
    target: riskTarget,
    achievementPct: Math.round(riskAchievement),
    gap: Math.round(riskCurrent - riskTarget),
    priority: riskAchievement < 50 ? 'high' : riskAchievement < 75 ? 'medium' : 'low',
    trend: prevRisk === null ? 'unknown'
      : riskCurrent < prevRisk - 3 ? 'improving'
      : riskCurrent > prevRisk + 3 ? 'worsening'
      : 'stalled',
  });

  const strengthTarget = goalProfile.strengthTarget;
  const strengthCurrent = snapshot.muscleStatePredictions.length > 0
    ? snapshot.muscleStatePredictions.reduce((s, m) => s + clamp(m.predictedTension * 1.2, 0, 100), 0) / snapshot.muscleStatePredictions.length
    : strengthTarget;
  const strengthAchievement = strengthTarget > 0
    ? clamp((strengthCurrent / strengthTarget) * 100, 0, 100)
    : 100;

  dimensions.push({
    dimension: 'strength',
    label: 'Functional Strength',
    current: Math.round(strengthCurrent),
    target: strengthTarget,
    achievementPct: Math.round(strengthAchievement),
    gap: Math.round(strengthTarget - strengthCurrent),
    priority: strengthAchievement < 50 ? 'high' : strengthAchievement < 75 ? 'medium' : 'low',
    trend: 'unknown',
  });

  const jointStressTarget = goalProfile.jointStressTarget;
  const jointStressCurrent = snapshot.riskScore * 0.6;
  const jointStressAchievement = jointStressCurrent <= jointStressTarget
    ? 100
    : clamp(((100 - jointStressCurrent) / (100 - jointStressTarget)) * 100, 0, 100);

  dimensions.push({
    dimension: 'joint_stress',
    label: 'Joint Stress',
    current: Math.round(jointStressCurrent),
    target: jointStressTarget,
    achievementPct: Math.round(jointStressAchievement),
    gap: Math.round(jointStressCurrent - jointStressTarget),
    priority: jointStressAchievement < 50 ? 'high' : jointStressAchievement < 75 ? 'medium' : 'low',
    trend: 'unknown',
  });

  const weights = { rom: 0.22, pain: 0.22, sling: 0.13, comp: 0.13, muscle: 0.1, risk: 0.08, strength: 0.07, jointStress: 0.05 };
  const overallAchievementPct = Math.round(
    romAchievement * weights.rom +
    painAchievement * weights.pain +
    slingAchievement * weights.sling +
    compensationAchievement * weights.comp +
    muscleTensionAchievement * weights.muscle +
    riskAchievement * weights.risk +
    strengthAchievement * weights.strength +
    jointStressAchievement * weights.jointStress
  );

  const priorityDimensions = dimensions
    .filter(d => d.priority === 'high')
    .sort((a, b) => a.achievementPct - b.achievementPct);

  const goalsMet = overallAchievementPct >= 90 && painAchievement >= 90 && romAchievement >= 85;

  let estimatedSessionsRemaining: number | null = null;
  if (previousSnapshot && snapshot.sessionNumber > 1) {
    const prevGapTotal = dimensions.reduce((s, d) => s + (100 - d.achievementPct), 0);
    if (prevGapTotal > 0 && overallAchievementPct < 95) {
      const gapPerSession = prevGapTotal / snapshot.sessionNumber;
      const remainingGap = dimensions.reduce((s, d) => s + Math.max(0, 100 - d.achievementPct), 0);
      estimatedSessionsRemaining = gapPerSession > 0 ? Math.ceil(remainingGap / gapPerSession) : null;
    }
  }

  const narrative = buildNarrative(overallAchievementPct, priorityDimensions, goalsMet, goalProfile);

  return {
    timestamp: Date.now(),
    sessionNumber: snapshot.sessionNumber,
    overallAchievementPct,
    dimensions,
    priorityDimensions,
    romAchievementPct: Math.round(romAchievement),
    painAchievementPct: Math.round(painAchievement),
    slingAchievementPct: Math.round(slingAchievement),
    compensationAchievementPct: Math.round(compensationAchievement),
    muscleTensionAchievementPct: Math.round(muscleTensionAchievement),
    riskAchievementPct: Math.round(riskAchievement),
    goalsMet,
    estimatedSessionsRemaining,
    narrative,
  };
}

function buildNarrative(
  overall: number,
  priorities: DimensionGap[],
  goalsMet: boolean,
  profile: RecoveryGoalProfile,
): string {
  if (goalsMet) {
    return `Recovery goals for ${profile.conditionName} have been substantially met. All key dimensions are within target range.`;
  }
  if (overall >= 80) {
    const remaining = priorities.map(p => p.label).join(', ');
    return `Good progress toward recovery goals (${overall}%). ${remaining ? `Remaining focus areas: ${remaining}.` : 'Nearing full recovery.'}`;
  }
  if (overall >= 50) {
    const top = priorities.slice(0, 3).map(p => `${p.label} (${p.achievementPct}%)`).join(', ');
    return `Moderate progress (${overall}%). Priority gaps: ${top || 'general improvement needed'}.`;
  }
  const top = priorities.slice(0, 3).map(p => `${p.label} (${p.achievementPct}%)`).join(', ');
  return `Early recovery phase (${overall}%). Key areas requiring attention: ${top || 'overall recovery'}.`;
}

export function formatGoalContextForPrompt(
  goalProfile: RecoveryGoalProfile,
  gapAnalysis: GoalGapAnalysis | null,
): string {
  const lines: string[] = [];
  lines.push(`RECOVERY GOAL TARGETS for ${goalProfile.conditionName}:`);

  if (goalProfile.romTargets.length > 0) {
    lines.push(`\nROM Targets (${goalProfile.overallRomRecoveryPercent}% of normal):`);
    for (const r of goalProfile.romTargets) {
      lines.push(`  - ${r.label}: ${r.targetDegrees}° (normal: ${r.normalDegrees}°)`);
    }
  }

  lines.push(`\nPain Target: ≤${goalProfile.painTarget}/100 (0=no pain, 100=worst pain)`);
  lines.push(`Risk Score Target: <${goalProfile.riskScoreTarget}/100`);
  lines.push(`Strength Target: >${goalProfile.strengthTarget}% of contralateral`);
  lines.push(`Joint Stress Target: <${goalProfile.jointStressTarget}/100`);
  lines.push(`Compensation Resolution Target: >${goalProfile.compensationResolutionTarget}%`);

  if (goalProfile.postureTargets.length > 0) {
    lines.push(`\nPosture Correction Targets:`);
    for (const pt of goalProfile.postureTargets) {
      lines.push(`  - ${pt.deviationType}: correct ${pt.axis}-axis at ${pt.boneName} toward ${pt.targetAngle}°`);
    }
  }

  if (goalProfile.slingTargets.length > 0) {
    lines.push(`\nSling Integrity Targets:`);
    for (const s of goalProfile.slingTargets) {
      lines.push(`  - ${s.slingName}: >${s.targetIntegrity}%`);
    }
  }

  if (goalProfile.muscleTensionTargets.length > 0) {
    lines.push(`\nMuscle Tension Targets (optimal range):`);
    for (const mt of goalProfile.muscleTensionTargets.slice(0, 8)) {
      lines.push(`  - ${mt.muscleId.replace(/_/g, ' ')}: ${mt.targetTensionMin}-${mt.targetTensionMax}%`);
    }
  }

  if (goalProfile.functionalGoals.length > 0) {
    lines.push(`\nFunctional Goals:`);
    for (const fg of goalProfile.functionalGoals) {
      lines.push(`  - ${fg.label}: ${fg.targetValue}${fg.unit}`);
    }
  }

  if (gapAnalysis) {
    lines.push(`\nCURRENT GOAL GAP ANALYSIS (Session ${gapAnalysis.sessionNumber}):`);
    lines.push(`Overall achievement: ${gapAnalysis.overallAchievementPct}%`);
    lines.push(`ROM: ${gapAnalysis.romAchievementPct}% | Pain: ${gapAnalysis.painAchievementPct}% | Sling: ${gapAnalysis.slingAchievementPct}% | Compensation: ${gapAnalysis.compensationAchievementPct}%`);

    if (gapAnalysis.priorityDimensions.length > 0) {
      lines.push(`\nHIGH-PRIORITY GAPS (design treatments to CLOSE these gaps):`);
      for (const d of gapAnalysis.priorityDimensions.slice(0, 5)) {
        lines.push(`  - ${d.label}: current=${d.current}, target=${d.target}, achievement=${d.achievementPct}%, trend=${d.trend}`);
      }
    }

    lines.push(`\nDesign exercises/techniques that specifically CLOSE the gap between current state and these recovery targets. Prioritize the highest-gap dimensions.`);
  }

  return lines.join('\n');
}

export function computeGoalAchievementTimeline(
  goalProfile: RecoveryGoalProfile,
  sessions: SessionSnapshot[],
): GoalGapAnalysis[] {
  const analyses: GoalGapAnalysis[] = [];
  for (let i = 0; i < sessions.length; i++) {
    const prev = i > 0 ? sessions[i - 1] : null;
    analyses.push(computeGoalGap(goalProfile, sessions[i], prev));
  }
  return analyses;
}
