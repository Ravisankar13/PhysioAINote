import type { RecoveryGoalProfile, GoalGapAnalysis, DimensionGap, ClinicalStateInput } from './goalStateEngine';
import type { SessionSnapshot } from './simulationTimelineEngine';
import { EXERCISE_CATALOG, type CatalogExercise } from '@shared/exerciseCatalog';

export interface GoalGapPriority {
  dimension: string;
  label: string;
  current: number;
  target: number;
  gapPercent: number;
  priority: 'high' | 'medium' | 'low';
  trend: 'improving' | 'stalled' | 'worsening' | 'unknown';
  relevantBodyParts: string[];
  recommendedCategories: ExerciseCategory[];
}

export type ExerciseCategory = 'strengthening' | 'stretching' | 'mobility' | 'neuromuscular' | 'functional' | 'stabilization' | 'manual';

export interface DosageScaling {
  setsMultiplier: number;
  repMultiplier: number;
  intensityLabel: 'light' | 'light-moderate' | 'moderate' | 'moderate-heavy' | 'heavy';
  painCeiling: number;
  rationale: string;
}

export interface MtGradeGuidance {
  minGrade: string;
  maxGrade: string;
  rationale: string;
  preferSustained: boolean;
}

export interface PrescriptionContext {
  goalGaps: GoalGapPriority[];
  contraindications: string[];
  dosageScaling: DosageScaling;
  mtGradeGuidance: MtGradeGuidance;
  phaseLabel: string;
  phaseIndex: number;
  conditionName: string;
  painTarget: number;
  currentPain: number;
  priorityBodyParts: string[];
  priorityExerciseCategories: ExerciseCategory[];
  recommendedExerciseIds: string[];
  recommendedManualIds: string[];
  sessionNumber: number | null;
  goalAchievementPct: number;
}

const DIMENSION_BODY_PARTS: Record<string, string[]> = {
  rom_shoulder_flexion: ['shoulder'],
  rom_shoulder_abduction: ['shoulder'],
  rom_shoulder_er: ['shoulder'],
  rom_shoulder_ir: ['shoulder'],
  rom_elbow_flexion: ['elbow'],
  rom_hip_flexion: ['hip', 'lumbar'],
  rom_hip_abduction: ['hip'],
  rom_hip_er: ['hip'],
  rom_hip_ir: ['hip'],
  rom_knee_flexion: ['knee'],
  rom_knee_extension: ['knee'],
  rom_ankle_dorsiflexion: ['ankle'],
  rom_ankle_plantarflexion: ['ankle'],
  rom_cervical_flexion: ['cervical', 'neck'],
  rom_cervical_rotation: ['cervical', 'neck'],
  rom_lumbar_flexion: ['lumbar'],
  rom_lumbar_extension: ['lumbar'],
  rom_thoracic_rotation: ['thoracic'],
  pain: ['cervical', 'shoulder', 'lumbar', 'hip', 'knee', 'ankle'],
  sling_integrity: ['hip', 'lumbar', 'shoulder', 'core'],
  compensation_resolution: ['hip', 'lumbar', 'core'],
  muscle_tension: ['cervical', 'shoulder', 'hip', 'lumbar'],
  risk_score: [],
  strength: ['hip', 'knee', 'shoulder', 'core'],
};

const DIMENSION_EXERCISE_CATEGORIES: Record<string, ExerciseCategory[]> = {
  pain: ['stretching', 'mobility', 'manual'],
  sling_integrity: ['stabilization', 'functional', 'strengthening'],
  compensation_resolution: ['stabilization', 'neuromuscular', 'functional'],
  muscle_tension: ['stretching', 'manual', 'mobility'],
  risk_score: ['stabilization', 'strengthening'],
  strength: ['strengthening', 'functional'],
};

function categoriesForRomGap(): ExerciseCategory[] {
  return ['stretching', 'mobility', 'manual'];
}

function bodyPartsForDimension(dim: string): string[] {
  if (dim.startsWith('rom_')) {
    return DIMENSION_BODY_PARTS[dim] ?? [];
  }
  if (dim.startsWith('sling_')) {
    return DIMENSION_BODY_PARTS['sling_integrity'] ?? [];
  }
  return DIMENSION_BODY_PARTS[dim] ?? [];
}

function exerciseCategoriesForDimension(dim: string): ExerciseCategory[] {
  if (dim.startsWith('rom_')) return categoriesForRomGap();
  return DIMENSION_EXERCISE_CATEGORIES[dim] ?? ['strengthening', 'stretching'];
}

function computeDosageScaling(
  painLevel: number,
  painTarget: number,
  phaseIndex: number,
  achievementPct: number,
): DosageScaling {
  const painRatio = painLevel / 100;
  const isHighPain = painRatio > 0.5;
  const isLowAchievement = achievementPct < 40;

  if (isHighPain || phaseIndex === 0) {
    return {
      setsMultiplier: 0.7,
      repMultiplier: 0.8,
      intensityLabel: 'light',
      painCeiling: Math.max(painTarget + 10, 30),
      rationale: isHighPain
        ? `Pain at ${Math.round(painLevel)}/100 — reduce load, prioritise pain management`
        : 'Phase 1 — conservative dosage, tissue protection',
    };
  }

  if (phaseIndex === 1) {
    return {
      setsMultiplier: 1.0,
      repMultiplier: 1.0,
      intensityLabel: 'moderate',
      painCeiling: Math.max(painTarget + 15, 35),
      rationale: 'Phase 2 — controlled loading, moderate intensity',
    };
  }

  if (isLowAchievement) {
    return {
      setsMultiplier: 0.8,
      repMultiplier: 0.9,
      intensityLabel: 'light-moderate',
      painCeiling: Math.max(painTarget + 10, 30),
      rationale: `Goal achievement at ${Math.round(achievementPct)}% — conservative dosage, avoid overloading recovering tissues`,
    };
  }

  if (achievementPct > 70) {
    return {
      setsMultiplier: 1.2,
      repMultiplier: 1.2,
      intensityLabel: 'moderate-heavy',
      painCeiling: Math.max(painTarget + 20, 40),
      rationale: 'Near goal — progressive overload to close remaining gap',
    };
  }

  return {
    setsMultiplier: 1.0,
    repMultiplier: 1.0,
    intensityLabel: 'moderate',
    painCeiling: Math.max(painTarget + 15, 35),
    rationale: 'Phase 3+ — steady loading, building towards functional targets',
  };
}

function computeMtGradeGuidance(
  painLevel: number,
  phaseIndex: number,
  contraindications: string[],
): MtGradeGuidance {
  const hasManipContra = contraindications.some(c =>
    c.toLowerCase().includes('manipulation') || c.toLowerCase().includes('high-velocity'),
  );

  if (painLevel > 60 || phaseIndex === 0) {
    return {
      minGrade: 'Grade I',
      maxGrade: 'Grade II',
      rationale: 'High irritability — pain-dominant presentation, use oscillatory grades within pain-free range',
      preferSustained: false,
    };
  }

  if (painLevel > 30 || phaseIndex === 1) {
    return {
      minGrade: 'Grade II',
      maxGrade: hasManipContra ? 'Grade III' : 'Grade III-IV',
      rationale: 'Moderate irritability — can push into resistance with oscillatory techniques',
      preferSustained: !hasManipContra,
    };
  }

  return {
    minGrade: 'Grade III',
    maxGrade: hasManipContra ? 'Grade IV' : 'Grade IV-V',
    rationale: 'Low irritability — stiffness-dominant, use end-range mobilisation techniques',
    preferSustained: true,
  };
}

const PHASE_LABELS = ['Phase 1 — Protection', 'Phase 2 — Loading', 'Phase 3 — Strengthening', 'Phase 4 — Return'];

function selectRecommendedExercises(
  bodyParts: string[],
  categories: ExerciseCategory[],
  contraindications: string[],
  maxCount: number,
): string[] {
  const contraLower = contraindications.map(c => c.toLowerCase());

  const scored: Array<{ id: string; score: number }> = [];

  for (const ex of EXERCISE_CATALOG) {
    if (ex.category === 'manual') continue;

    const bodyMatch = ex.bodyParts.some(bp =>
      bodyParts.some(pb => bp.includes(pb) || pb.includes(bp)),
    );
    if (!bodyMatch) continue;

    const isContraindicated = contraLower.some(c => {
      const nameLower = ex.name.toLowerCase();
      return nameLower.includes(c) || c.includes(nameLower);
    });
    if (isContraindicated) continue;

    let score = 0;
    if (categories.includes(ex.category)) score += 3;
    const bpOverlap = ex.bodyParts.filter(bp =>
      bodyParts.some(pb => bp.includes(pb) || pb.includes(bp)),
    ).length;
    score += bpOverlap * 2;

    scored.push({ id: ex.id, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount).map(s => s.id);
}

function selectRecommendedManualTherapy(
  bodyParts: string[],
  mtGrade: MtGradeGuidance,
  contraindications: string[],
  maxCount: number,
): string[] {
  const contraLower = contraindications.map(c => c.toLowerCase());

  const scored: Array<{ id: string; score: number }> = [];

  for (const ex of EXERCISE_CATALOG) {
    if (ex.category !== 'manual') continue;

    const bodyMatch = ex.bodyParts.some(bp =>
      bodyParts.some(pb => bp.includes(pb) || pb.includes(bp)),
    );
    if (!bodyMatch) continue;

    const isContraindicated = contraLower.some(c => {
      const nameLower = ex.name.toLowerCase();
      const structLower = (ex.targetStructure || '').toLowerCase();
      return nameLower.includes(c) || structLower.includes(c) || c.includes(nameLower);
    });
    if (isContraindicated) continue;

    let score = 0;
    const bpOverlap = ex.bodyParts.filter(bp =>
      bodyParts.some(pb => bp.includes(pb) || pb.includes(bp)),
    ).length;
    score += bpOverlap * 2;

    if (ex.mobilisationGrade) {
      const gradeNum = parseGradeNumber(ex.mobilisationGrade);
      const maxGradeNum = parseGradeNumber(mtGrade.maxGrade);
      if (gradeNum <= maxGradeNum) score += 2;
      else score -= 3;
    }

    if (mtGrade.preferSustained && ex.mobilisationGrade?.includes('Sustained')) {
      score += 2;
    }

    scored.push({ id: ex.id, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount).map(s => s.id);
}

function parseGradeNumber(grade: string): number {
  const rangeMatch = grade.match(/([IV]+)\s*[-–]\s*([IV]+)/);
  if (rangeMatch) {
    const high = romanToNum(rangeMatch[2]);
    return high;
  }
  return romanToNum(grade);
}

function romanToNum(s: string): number {
  if (s.includes('IV') || s.includes('4')) return 4;
  if (s.includes('V') || s.includes('5')) return 5;
  if (s.includes('III') || s.includes('3')) return 3;
  if (s.includes('II') || s.includes('2')) return 2;
  if (s.includes('I') || s.includes('1')) return 1;
  return 3;
}

export function buildPrescriptionContext(
  goalProfile: RecoveryGoalProfile,
  clinicalState: ClinicalStateInput,
  goalGap: GoalGapAnalysis | null,
  sessionSnapshot: SessionSnapshot | null,
): PrescriptionContext {
  const phaseIndex = clinicalState.activePhaseIndex ?? 0;
  const currentPain = sessionSnapshot?.painPrediction
    ?? (clinicalState.painMarkers && clinicalState.painMarkers.length > 0
      ? Math.max(...clinicalState.painMarkers.map(p => p.intensity))
      : 30);

  const achievementPct = goalGap?.overallAchievementPct ?? 0;

  const contraindications: string[] = [];
  if (goalProfile.contraindications && goalProfile.contraindications.length > 0) {
    contraindications.push(...goalProfile.contraindications);
  }

  const dimensions: DimensionGap[] = goalGap?.dimensions ?? [];
  const goalGaps: GoalGapPriority[] = dimensions
    .filter(d => d.achievementPct < 100)
    .sort((a, b) => a.achievementPct - b.achievementPct)
    .map(d => ({
      dimension: d.dimension,
      label: d.label,
      current: d.current,
      target: d.target,
      gapPercent: 100 - d.achievementPct,
      priority: d.priority,
      trend: d.trend,
      relevantBodyParts: bodyPartsForDimension(d.dimension),
      recommendedCategories: exerciseCategoriesForDimension(d.dimension),
    }));

  const priorityBodyParts = Array.from(
    new Set(
      goalGaps
        .filter(g => g.priority === 'high' || g.priority === 'medium')
        .flatMap(g => g.relevantBodyParts),
    ),
  );

  const priorityExerciseCategories = Array.from(
    new Set(
      goalGaps
        .filter(g => g.priority === 'high')
        .flatMap(g => g.recommendedCategories),
    ),
  ) as ExerciseCategory[];

  const dosageScaling = computeDosageScaling(currentPain, goalProfile.painTarget, phaseIndex, achievementPct);
  const mtGradeGuidance = computeMtGradeGuidance(currentPain, phaseIndex, contraindications);

  const recommendedExerciseIds = selectRecommendedExercises(
    priorityBodyParts.length > 0 ? priorityBodyParts : ['lumbar', 'core'],
    priorityExerciseCategories.length > 0 ? priorityExerciseCategories : ['strengthening', 'stretching'],
    contraindications,
    10,
  );

  const recommendedManualIds = selectRecommendedManualTherapy(
    priorityBodyParts.length > 0 ? priorityBodyParts : ['lumbar'],
    mtGradeGuidance,
    contraindications,
    8,
  );

  return {
    goalGaps,
    contraindications,
    dosageScaling,
    mtGradeGuidance,
    phaseLabel: PHASE_LABELS[Math.min(phaseIndex, PHASE_LABELS.length - 1)],
    phaseIndex,
    conditionName: goalProfile.conditionName,
    painTarget: goalProfile.painTarget,
    currentPain,
    priorityBodyParts,
    priorityExerciseCategories,
    recommendedExerciseIds,
    recommendedManualIds,
    sessionNumber: sessionSnapshot?.sessionNumber ?? null,
    goalAchievementPct: achievementPct,
  };
}

export function getExerciseById(id: string): CatalogExercise | undefined {
  return EXERCISE_CATALOG.find(e => e.id === id);
}

export function scaleDosage(
  baseSets: number,
  baseReps: string,
  scaling: DosageScaling,
): { sets: number; reps: string } {
  const scaledSets = Math.max(1, Math.round(baseSets * scaling.setsMultiplier));

  const repMatch = baseReps.match(/^(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!repMatch) return { sets: scaledSets, reps: baseReps };

  const low = Math.max(1, Math.round(parseInt(repMatch[1]) * scaling.repMultiplier));
  if (repMatch[2]) {
    const high = Math.max(low, Math.round(parseInt(repMatch[2]) * scaling.repMultiplier));
    return { sets: scaledSets, reps: `${low}-${high}` };
  }

  return { sets: scaledSets, reps: `${low}` };
}

export function formatContraindicationWarnings(contraindications: string[]): string {
  if (contraindications.length === 0) return '';
  return contraindications.map(c => `⚠ ${c}`).join('\n');
}

export function formatPrescriptionSummary(ctx: PrescriptionContext): string {
  const lines: string[] = [];
  lines.push(`Condition: ${ctx.conditionName}`);
  lines.push(`${ctx.phaseLabel} | Goal achievement: ${Math.round(ctx.goalAchievementPct)}%`);
  lines.push(`Pain: ${Math.round(ctx.currentPain)}/100 → Target: ${ctx.painTarget}/100`);
  lines.push(`Dosage: ${ctx.dosageScaling.intensityLabel} | MT grades: ${ctx.mtGradeGuidance.minGrade}–${ctx.mtGradeGuidance.maxGrade}`);

  if (ctx.goalGaps.length > 0) {
    lines.push('');
    lines.push('Priority gaps:');
    for (const gap of ctx.goalGaps.slice(0, 5)) {
      const arrow = gap.trend === 'improving' ? '↑' : gap.trend === 'worsening' ? '↓' : '→';
      lines.push(`  ${arrow} ${gap.label}: ${Math.round(gap.gapPercent)}% gap (${gap.priority})`);
    }
  }

  if (ctx.contraindications.length > 0) {
    lines.push('');
    lines.push('Contraindications:');
    for (const c of ctx.contraindications) {
      lines.push(`  ⚠ ${c}`);
    }
  }

  return lines.join('\n');
}

const RECOVERY_PHASE_TO_INDEX: Record<string, number> = {
  'Acute/Protective': 0,
  'Proliferative': 1,
  'Remodeling': 2,
  'Functional': 3,
  'Return to Activity': 3,
};

export interface TimelinePrescriptionSummary {
  sessionPrescriptions: PrescriptionContext[];
  exerciseProgression: ExerciseProgressionEntry[];
  manualProgression: ManualProgressionEntry[];
}

export interface ExerciseProgressionEntry {
  exerciseId: string;
  exerciseName: string;
  category: string;
  bodyParts: string[];
  sessionRanges: Array<{
    startSession: number;
    endSession: number;
    dosageLabel: string;
    setsMultiplier: number;
  }>;
  firstSession: number;
  lastSession: number;
  status: 'active' | 'discontinued';
}

export interface ManualProgressionEntry {
  exerciseId: string;
  techniqueName: string;
  bodyParts: string[];
  gradeProgression: Array<{
    session: number;
    minGrade: string;
    maxGrade: string;
  }>;
  firstSession: number;
  lastSession: number;
}

export function computeTimelinePrescriptions(
  sessions: SessionSnapshot[],
  goalProfile: RecoveryGoalProfile,
  baseGoalGap: GoalGapAnalysis | null,
): TimelinePrescriptionSummary {
  const sessionPrescriptions: PrescriptionContext[] = [];

  for (const session of sessions) {
    const phaseIndex = RECOVERY_PHASE_TO_INDEX[session.recoveryPhaseLabel] ?? 0;

    const maxPain = session.painMarkerPredictions.length > 0
      ? Math.max(...session.painMarkerPredictions.map(p => p.predictedSeverity))
      : session.painPrediction;

    const clinicalState: ClinicalStateInput = {
      painMarkers: session.painMarkerPredictions.map(p => ({
        boneName: p.markerLabel ?? 'unknown',
        intensity: p.predictedSeverity,
      })),
      posturalDeviations: [],
      activePhaseIndex: phaseIndex,
    };

    const sessionGap: GoalGapAnalysis | null = session.goalDimensions && session.goalAchievementPct !== undefined
      ? {
          timestamp: Date.now(),
          sessionNumber: session.sessionNumber,
          overallAchievementPct: session.goalAchievementPct,
          dimensions: session.goalDimensions.map(d => ({
            dimension: d.dimension,
            label: d.label,
            current: d.current,
            target: d.target,
            achievementPct: d.achievementPct,
            gap: d.gap,
            priority: d.priority as 'high' | 'medium' | 'low',
            trend: d.trend as 'improving' | 'stalled' | 'worsening' | 'unknown',
          })),
          priorityDimensions: [],
          romAchievementPct: 0,
          painAchievementPct: maxPain <= goalProfile.painTarget ? 100 : Math.max(0, (1 - (maxPain - goalProfile.painTarget) / 100) * 100),
          slingAchievementPct: 0,
          compensationAchievementPct: 0,
          muscleTensionAchievementPct: 0,
          riskAchievementPct: 0,
          goalsMet: session.goalAchievementPct >= 95,
          estimatedSessionsRemaining: null,
          narrative: '',
        }
      : baseGoalGap;

    const ctx = buildPrescriptionContext(goalProfile, clinicalState, sessionGap, session);
    sessionPrescriptions.push(ctx);
  }

  const exerciseProgression = buildExerciseProgression(sessionPrescriptions);
  const manualProgression = buildManualProgression(sessionPrescriptions);

  return { sessionPrescriptions, exerciseProgression, manualProgression };
}

function buildExerciseProgression(prescriptions: PrescriptionContext[]): ExerciseProgressionEntry[] {
  const exerciseSessionMap = new Map<string, { sessions: number[]; dosageLabels: Map<number, string>; setsMultipliers: Map<number, number> }>();

  for (const ctx of prescriptions) {
    const sessionNum = ctx.sessionNumber ?? 0;
    for (const exId of ctx.recommendedExerciseIds) {
      let entry = exerciseSessionMap.get(exId);
      if (!entry) {
        entry = { sessions: [], dosageLabels: new Map(), setsMultipliers: new Map() };
        exerciseSessionMap.set(exId, entry);
      }
      entry.sessions.push(sessionNum);
      entry.dosageLabels.set(sessionNum, ctx.dosageScaling.intensityLabel);
      entry.setsMultipliers.set(sessionNum, ctx.dosageScaling.setsMultiplier);
    }
  }

  const result: ExerciseProgressionEntry[] = [];
  for (const [exId, data] of exerciseSessionMap) {
    const catalogEntry = EXERCISE_CATALOG.find(e => e.id === exId);
    if (!catalogEntry) continue;

    const sortedSessions = [...data.sessions].sort((a, b) => a - b);
    const lastPrescriptionSession = prescriptions.length > 0 ? (prescriptions[prescriptions.length - 1].sessionNumber ?? prescriptions.length) : 0;

    const ranges: ExerciseProgressionEntry['sessionRanges'] = [];
    let rangeStart = sortedSessions[0];
    let currentDosage = data.dosageLabels.get(rangeStart) ?? 'moderate';
    let currentMult = data.setsMultipliers.get(rangeStart) ?? 1;

    for (let i = 1; i < sortedSessions.length; i++) {
      const s = sortedSessions[i];
      const dosage = data.dosageLabels.get(s) ?? 'moderate';
      if (dosage !== currentDosage || s - sortedSessions[i - 1] > 1) {
        ranges.push({ startSession: rangeStart, endSession: sortedSessions[i - 1], dosageLabel: currentDosage, setsMultiplier: currentMult });
        rangeStart = s;
        currentDosage = dosage;
        currentMult = data.setsMultipliers.get(s) ?? 1;
      }
    }
    ranges.push({ startSession: rangeStart, endSession: sortedSessions[sortedSessions.length - 1], dosageLabel: currentDosage, setsMultiplier: currentMult });

    result.push({
      exerciseId: exId,
      exerciseName: catalogEntry.name,
      category: catalogEntry.category,
      bodyParts: catalogEntry.bodyParts,
      sessionRanges: ranges,
      firstSession: sortedSessions[0],
      lastSession: sortedSessions[sortedSessions.length - 1],
      status: sortedSessions[sortedSessions.length - 1] >= lastPrescriptionSession ? 'active' : 'discontinued',
    });
  }

  result.sort((a, b) => a.firstSession - b.firstSession);
  return result;
}

function buildManualProgression(prescriptions: PrescriptionContext[]): ManualProgressionEntry[] {
  const mtSessionMap = new Map<string, { sessions: number[]; grades: Map<number, { min: string; max: string }> }>();

  for (const ctx of prescriptions) {
    const sessionNum = ctx.sessionNumber ?? 0;
    for (const mtId of ctx.recommendedManualIds) {
      let entry = mtSessionMap.get(mtId);
      if (!entry) {
        entry = { sessions: [], grades: new Map() };
        mtSessionMap.set(mtId, entry);
      }
      entry.sessions.push(sessionNum);
      entry.grades.set(sessionNum, { min: ctx.mtGradeGuidance.minGrade, max: ctx.mtGradeGuidance.maxGrade });
    }
  }

  const result: ManualProgressionEntry[] = [];
  for (const [mtId, data] of mtSessionMap) {
    const catalogEntry = EXERCISE_CATALOG.find(e => e.id === mtId);
    if (!catalogEntry) continue;

    const sortedSessions = [...data.sessions].sort((a, b) => a - b);
    const gradeProgression: ManualProgressionEntry['gradeProgression'] = [];
    let lastGrade = '';
    for (const s of sortedSessions) {
      const g = data.grades.get(s);
      if (!g) continue;
      const gradeKey = `${g.min}-${g.max}`;
      if (gradeKey !== lastGrade) {
        gradeProgression.push({ session: s, minGrade: g.min, maxGrade: g.max });
        lastGrade = gradeKey;
      }
    }

    result.push({
      exerciseId: mtId,
      techniqueName: catalogEntry.name,
      bodyParts: catalogEntry.bodyParts,
      gradeProgression,
      firstSession: sortedSessions[0],
      lastSession: sortedSessions[sortedSessions.length - 1],
    });
  }

  result.sort((a, b) => a.firstSession - b.firstSession);
  return result;
}
