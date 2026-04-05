import { getLinkedEvidenceForCandidate, type ClinicalStatusKey } from '@shared/evidenceReferences';
import type {
  ClinicalReasoningResult,
  IrritabilityLevel,
  ConditionStageType,
  ProblemClass,
  DominantMechanism,
  ExtractionContextInput,
} from './clinicalReasoningEngine';
import { queryEvidenceEngine, type EvidenceQueryResult, CLINICAL_STOP_WORDS } from './evidenceEngine';

export type InterventionTier = 'primary' | 'adjunct' | 'avoid_defer';
export type InterventionIntent = 'symptom_relief' | 'root_cause' | 'both';
export type InterventionCategory =
  | 'manual_therapy'
  | 'exercise'
  | 'modality'
  | 'education'
  | 'load_management'
  | 'neural'
  | 'pharmacological_referral';

export interface TreatmentCandidate {
  id: string;
  name: string;
  category: InterventionCategory;
  description: string;
  dosage: string;
  rationale: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'Expert';
  targetRegions: string[];
  contraindications: string[];
  stageRestrictions?: ConditionStageType[];
  irritabilityMax?: IrritabilityLevel;
  expectedTimeframe: string;
  problemClassMatch: ProblemClass[];
  mechanismMatch: DominantMechanism[];
  linkedTechniqueDbKeys?: string[];
  evidenceRelevanceScore?: number;
  conditionKeywords?: string[];
  sourceLibrary?: string;
  expertApproach?: string;
  references?: Array<{ authors: string; year: number; title: string; journal: string; pmid?: string }>;
}

export interface RankedIntervention {
  id: string;
  name: string;
  category: InterventionCategory;
  tier: InterventionTier;
  intent: InterventionIntent;
  score: number;
  confidence: number;
  expectedTimeframe: string;
  description: string;
  dosage: string;
  rationale: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'Expert';
  targetRegions: string[];
  riskFlags: string[];
  explainability: string[];
  stageAppropriate: boolean;
  irritabilityAppropriate: boolean;
  linkedTechniques: string[];
  sourceLibrary?: string;
  expertApproach?: string;
  references?: Array<{ authors: string; year: number; title: string; journal: string; pmid?: string }>;
  evidenceRelevanceScore?: number;
  conditionKeywords?: string[];
}

export interface ReviewSchedule {
  reassessmentDays: number;
  reassessmentLabel: string;
  irritabilityBasis: IrritabilityLevel;
  stageBasis: ConditionStageType;
  milestones: string[];
  criteria: string[];
}

export interface EvidenceOptionForPlan {
  id: string;
  name: string;
  dosage: string;
  rationale: string;
  evidenceGrade: string;
  references: Array<{ authors: string; year: number; title: string; journal: string; pmid?: string }>;
  sourceLibrary: string;
  expertApproach?: string;
  relevanceScore: number;
  targetRegions: string[];
  conditionKeywords?: string[];
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
  irritability: IrritabilityLevel;
  decisionSummary: string;
  timestamp: string;
  mechanismInformed: boolean;
  evidenceEngineContext?: {
    totalEvidenceOptions: number;
    gradeDistribution: Record<string, number>;
    topExpertApproaches: string[];
  };
  topEvidenceOptions?: EvidenceOptionForPlan[];
}

export interface BiomechanicsContextInput {
  faults?: Array<{ label: string; severity: 'mild' | 'moderate' | 'severe'; category: string; clinical: string; corrective: string }>;
  deviations?: Array<{ pattern: string; region: string; severity: 'mild' | 'moderate' | 'severe'; angleDeg: number }>;
  peakJoint?: string;
  peakForceBW?: number;
  qualityScore?: number;
  clinicalSummary?: string;
  movementTaskId?: string;
  movementTaskPhase?: string;
}

export interface SlingContextTarget {
  muscle: string;
  intervention: string;
  rationale: string;
}

export interface SlingContextEntry {
  sling: string;
  status: string;
  activationScore: number;
  forceTransfer: string;
  weakLinks: string[];
  treatmentTargets: SlingContextTarget[];
}

export interface SlingContextInput {
  overallForceTransferScore: number;
  dominantDysfunction: string | null;
  dysfunctionalSlings: SlingContextEntry[];
}

export interface MechanismContextTarget {
  structure: string;
  category: 'root_cause' | 'intermediate' | 'symptom' | 'compensation' | 'overload' | 'chain';
  severity: 'mild' | 'moderate' | 'severe';
  action: string;
  finding: string;
}

export interface MechanismContextInput {
  topTargets: MechanismContextTarget[];
  overallSummary: string;
  topContributors: string[];
  overloadedJointCount: number;
  compensationCount: number;
  rootCauseCount: number;
}

export interface TreatmentDecisionInput {
  structuredReasoning: ClinicalReasoningResult;
  muscleOverrides?: Record<string, { pathology?: string; tension?: number }>;
  painMarkers?: Array<{ region: string; severity?: number; type?: string }>;
  postureState?: Record<string, Record<string, number>>;
  extractionContext?: ExtractionContextInput;
  biomechanicsContext?: BiomechanicsContextInput;
  slingContext?: SlingContextInput;
  mechanismContext?: MechanismContextInput;
}

const CANDIDATE_TO_TECHNIQUE_STATUS: Record<string, ClinicalStatusKey[]> = {
  soft_tissue_release: ['shortened'],
  trigger_point_therapy: ['overactive'],
  stretching_programme: ['shortened'],
  eccentric_programme: ['shortened'],
  progressive_strengthening: ['weak'],
  isometric_loading: ['inhibited'],
  dry_needling: ['overactive'],
  motor_control_retraining: ['inhibited'],
  taping_support: ['lengthened'],
};

function resolveLinkedTechniques(candidateId: string): string[] {
  const statusKeys = CANDIDATE_TO_TECHNIQUE_STATUS[candidateId];
  if (!statusKeys) return [];
  const evidence = getLinkedEvidenceForCandidate(candidateId, statusKeys);
  return evidence.map(e => e.name);
}


interface EvidenceSourcedCandidates {
  candidates: TreatmentCandidate[];
  evidenceResult: import('./evidenceEngine').EvidenceQueryResult;
}

function buildCandidatesFromEvidenceEngine(
  regions: string[],
  problemClass: ProblemClass,
  mechanism: DominantMechanism,
  stage: ConditionStageType,
  irritability: IrritabilityLevel,
  structuredReasoning?: ClinicalReasoningResult,
  options?: { hasRedFlags?: boolean; hasMustNotMiss?: boolean },
): EvidenceSourcedCandidates {
  const evidenceResult = queryEvidenceEngine({
    diagnosis: structuredReasoning?.hypotheses?.[0]?.condition,
    bodyRegions: regions.length > 0 ? regions : undefined,
    stage,
    irritability,
    mechanism,
    problemClass,
    structuredReasoning,
  });

  const candidates: TreatmentCandidate[] = evidenceResult.options.map(opt => {
    const stageRestrictions: ConditionStageType[] = opt.stageAppropriateness ? [] : [stage];
    return {
      id: opt.id,
      name: opt.name,
      category: opt.category as InterventionCategory,
      description: opt.description,
      dosage: opt.dosage,
      rationale: opt.rationale,
      evidenceGrade: opt.evidenceGrade as 'A' | 'B' | 'C' | 'Expert',
      targetRegions: opt.targetRegions,
      contraindications: opt.contraindications,
      stageRestrictions,
      irritabilityMax: opt.irritabilityMax || (opt.loadCompatibility ? 'high' : 'moderate'),
      expectedTimeframe: opt.expectedTimeframe || 'Per clinical protocol',
      problemClassMatch: opt.problemClassMatch,
      mechanismMatch: opt.mechanismMatch,
      linkedTechniqueDbKeys: opt.linkedTechniqueDbKeys,
      evidenceRelevanceScore: opt.relevanceScore,
      conditionKeywords: opt.conditionKeywords && opt.conditionKeywords.length > 0
        ? opt.conditionKeywords
        : opt.name.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3),
      sourceLibrary: opt.sourceLibrary,
      expertApproach: opt.expertApproach,
      references: opt.references,
    };
  });

  if (options?.hasRedFlags || options?.hasMustNotMiss) {
    const hasReferral = candidates.some(c => c.category === 'pharmacological_referral');
    if (!hasReferral) {
      candidates.push({
        id: 'refer_imaging',
        name: 'Refer for Imaging / Specialist Review',
        category: 'pharmacological_referral',
        description: 'Onward referral when red flags are present, diagnosis uncertain, or conservative management plateaus',
        dosage: 'Urgent (red flags) or routine (6-12 week plateau)',
        rationale: 'Clinical governance: imaging or specialist assessment when conservative management is insufficient or unsafe',
        evidenceGrade: 'Expert',
        targetRegions: regions.length > 0 ? regions : ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
        contraindications: [],
        irritabilityMax: 'high',
        expectedTimeframe: 'Urgent: within 24-48 hours; Routine: 2-6 weeks',
        problemClassMatch: ['instability', 'sensitivity_dominant'],
        mechanismMatch: ['unknown'],
      });
    }
  }

  return { candidates, evidenceResult };
}

function matchScore(
  candidate: TreatmentCandidate,
  problemClass: ProblemClass,
  mechanism: DominantMechanism,
  topHypothesis: string,
  regions: string[],
): number {
  let score = 0;
  if (candidate.problemClassMatch.includes(problemClass)) score += 25;
  if (candidate.mechanismMatch.includes(mechanism)) score += 25;
  if (candidate.evidenceGrade === 'A') score += 10;
  else if (candidate.evidenceGrade === 'B') score += 6;
  else if (candidate.evidenceGrade === 'C') score += 3;
  else score += 1;

  if (candidate.evidenceRelevanceScore !== undefined && candidate.evidenceRelevanceScore > 0) {
    score += Math.min(25, Math.round(candidate.evidenceRelevanceScore * 0.35));
  }

  if (regions.length > 0 && candidate.targetRegions.length >= 6 && candidate.sourceLibrary === 'core') {
    score -= Math.min(15, (candidate.targetRegions.length - 3) * 3);
  }

  if (topHypothesis && topHypothesis !== 'Unknown presentation' && candidate.conditionKeywords?.length) {
    const diagLower = topHypothesis.toLowerCase();
    const diagWords = diagLower.split(/\s+/).filter(w => w.length > 2 && !CLINICAL_STOP_WORDS.has(w));
    const kwMatches = candidate.conditionKeywords.filter(
      k => diagLower.includes(k) || diagWords.some(dw => k.includes(dw) || dw.includes(k))
    ).length;
    if (kwMatches >= 2) score += 20;
    else if (kwMatches >= 1) score += 12;
  }

  if (candidate.expertApproach && topHypothesis && topHypothesis !== 'Unknown presentation') {
    const diagLower = topHypothesis.toLowerCase();
    const nameWords = candidate.name.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3);
    const nameMatch = nameWords.filter(w => diagLower.includes(w)).length;
    if (nameMatch >= 2) score += 10;
  }

  return score;
}

const HIGH_SEVERITY_MUST_NOT_MISS = [
  'cauda equina syndrome', 'spinal cord compression', 'fracture',
  'malignancy', 'infection', 'vascular compromise', 'progressive neurological deficit',
  'vertebral artery dissection', 'abdominal aortic aneurysm',
];

function riskFilter(
  candidate: TreatmentCandidate,
  stage: ConditionStageType,
  irritability: IrritabilityLevel,
  mustNotMiss: string[],
  patientContraindications: string[],
): { pass: boolean; flags: string[] } {
  const flags: string[] = [];

  if (candidate.stageRestrictions?.includes(stage)) {
    flags.push(`Not recommended in ${stage} stage`);
  }

  const irritabilityOrder: IrritabilityLevel[] = ['low', 'moderate', 'high'];
  if (candidate.irritabilityMax) {
    const maxIdx = irritabilityOrder.indexOf(candidate.irritabilityMax);
    const currentIdx = irritabilityOrder.indexOf(irritability);
    if (currentIdx > maxIdx) {
      flags.push(`Irritability too high (${irritability}) for this intervention (max: ${candidate.irritabilityMax})`);
    }
  }

  const severeMustNotMiss = mustNotMiss.filter(m =>
    HIGH_SEVERITY_MUST_NOT_MISS.some(s => m.toLowerCase().includes(s))
  );
  if (severeMustNotMiss.length > 0) {
    if (candidate.category !== 'pharmacological_referral' && candidate.category !== 'education') {
      flags.push(`High-severity must-not-miss present (${severeMustNotMiss[0]}) — defer until cleared by specialist`);
    }
  }

  for (const ci of candidate.contraindications) {
    const ciLower = ci.toLowerCase();
    if (patientContraindications.some(pc => pc.toLowerCase().includes(ciLower) || ciLower.includes(pc.toLowerCase()))) {
      flags.push(`Patient-specific contraindication: ${ci}`);
    }
  }

  return { pass: flags.length === 0, flags };
}

function classifyTier(
  score: number,
  riskPassed: boolean,
  candidate: TreatmentCandidate,
  problemClass: ProblemClass,
  context: {
    hasRedFlags: boolean;
    hasMustNotMiss: boolean;
    postureIsDominant: boolean;
  },
): InterventionTier {
  if (!riskPassed) return 'avoid_defer';

  if (candidate.category === 'pharmacological_referral') {
    if (context.hasRedFlags || context.hasMustNotMiss) return 'primary';
    return 'adjunct';
  }

  if (candidate.category === 'education') {
    if (candidate.id === 'ergonomic_advice' && context.postureIsDominant && score >= 40) return 'primary';
    return 'adjunct';
  }

  if (score >= 50 && candidate.problemClassMatch.includes(problemClass)) return 'primary';
  if (score >= 25) return 'adjunct';
  return 'adjunct';
}

function classifyIntent(candidate: TreatmentCandidate, mechanism: DominantMechanism): InterventionIntent {
  const symptomCategories: InterventionCategory[] = ['modality', 'manual_therapy'];
  const rootCategories: InterventionCategory[] = ['exercise', 'education', 'load_management'];
  if (rootCategories.includes(candidate.category)) {
    if (candidate.mechanismMatch.includes('sensitisation')) return 'both';
    return 'root_cause';
  }
  if (symptomCategories.includes(candidate.category)) {
    if (candidate.mechanismMatch.includes(mechanism)) return 'both';
    return 'symptom_relief';
  }
  return 'both';
}

function buildExplainability(
  candidate: TreatmentCandidate,
  tier: InterventionTier,
  score: number,
  riskFlags: string[],
  problemClass: ProblemClass,
  mechanism: DominantMechanism,
  stage: ConditionStageType,
  irritability: IrritabilityLevel,
): string[] {
  const reasons: string[] = [];
  if (candidate.problemClassMatch.includes(problemClass)) {
    reasons.push(`Matches problem class "${problemClass.replace(/_/g, ' ')}"`);
  }
  if (candidate.mechanismMatch.includes(mechanism)) {
    reasons.push(`Targets dominant mechanism "${mechanism.replace(/_/g, ' ')}"`);
  }
  if (candidate.evidenceGrade === 'A') {
    reasons.push('Supported by Grade A evidence');
  } else if (candidate.evidenceGrade === 'B') {
    reasons.push('Supported by Grade B evidence');
  }
  if (candidate.evidenceRelevanceScore !== undefined && candidate.evidenceRelevanceScore >= 50) {
    reasons.push(`High evidence relevance (${candidate.evidenceRelevanceScore}/100)`);
  }
  if (candidate.expertApproach) {
    reasons.push(`Expert approach: ${candidate.expertApproach}`);
  }
  if (candidate.sourceLibrary && candidate.sourceLibrary !== 'core') {
    reasons.push(`Source: ${candidate.sourceLibrary}`);
  }
  if (tier === 'avoid_defer') {
    reasons.push(...riskFlags);
  }
  if (tier === 'primary') {
    reasons.push(`High match score (${score}) — selected as primary intervention`);
  }
  return reasons;
}

function computeReviewSchedule(
  irritability: IrritabilityLevel,
  stage: ConditionStageType,
): ReviewSchedule {
  let reassessmentDays: number;
  let reassessmentLabel: string;
  const milestones: string[] = [];
  const criteria: string[] = [];

  if (irritability === 'high') {
    reassessmentDays = 2;
    reassessmentLabel = '1-2 days';
    milestones.push('Pain reduction to moderate irritability', 'Tolerate basic ADLs without flare');
    criteria.push('50% pain reduction on NRS', 'Able to sleep through night');
  } else if (irritability === 'moderate') {
    reassessmentDays = 7;
    reassessmentLabel = '1 week';
    milestones.push('Functional improvement in primary complaint', 'ROM improvement >10%');
    criteria.push('Consistent pain pattern (not worsening)', 'Tolerating exercise programme');
  } else {
    reassessmentDays = 21;
    reassessmentLabel = '2-4 weeks';
    milestones.push('Strength gains >15%', 'Return to modified sport/activity');
    criteria.push('Meeting progressive overload targets', 'No flare-ups with activity');
  }

  if (['acute', 'reactive'].includes(stage)) {
    reassessmentDays = Math.min(reassessmentDays, 3);
    reassessmentLabel = reassessmentDays <= 2 ? '1-2 days' : '3 days';
    milestones.unshift('Transition out of acute/reactive phase');
  }
  if (['chronic', 'chronic_recurrent', 'chronic_sensitised', 'degenerative'].includes(stage)) {
    reassessmentDays = Math.max(reassessmentDays, 14);
    reassessmentLabel = '2-4 weeks';
    milestones.push('Self-management confidence score >7/10');
    criteria.push('Adherence to home programme >80%');
  }

  return {
    reassessmentDays,
    reassessmentLabel,
    irritabilityBasis: irritability,
    stageBasis: stage,
    milestones,
    criteria,
  };
}

function extractRegionsFromReasoning(input: TreatmentDecisionInput): string[] {
  const regions = new Set<string>();
  const canonicalRegions = ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle', 'elbow', 'wrist'];
  const additionalKeywords: Record<string, string> = {
    neck: 'cervical',
    sacroiliac: 'hip',
  };

  if (input.painMarkers) {
    for (const pm of input.painMarkers) {
      if (pm.region) regions.add(pm.region.toLowerCase());
    }
  }

  const textSources: string[] = [];
  const sr = input.structuredReasoning;
  if (sr?.reasoningLayers?.presentation) textSources.push(sr.reasoningLayers.presentation);
  if (sr?.hypotheses?.length) {
    for (const h of sr.hypotheses) {
      if (h.condition) textSources.push(h.condition);
      if (h.supporting) {
        for (const s of h.supporting) {
          if (typeof s === 'string') textSources.push(s);
          else if (s && typeof s === 'object' && 'feature' in s) textSources.push((s as { feature: string }).feature);
        }
      }
    }
  }

  const ctx = input.extractionContext;
  if (ctx) {
    if (ctx.bodyRegions && Array.isArray(ctx.bodyRegions)) {
      for (const br of ctx.bodyRegions) {
        const lower = (typeof br === 'string' ? br : (br as { region: string }).region || '').toLowerCase();
        if (lower) regions.add(lower);
      }
    }
    if (ctx.mainComplaint) textSources.push(ctx.mainComplaint);
  }

  const combined = textSources.join(' ').toLowerCase();
  for (const kw of canonicalRegions) {
    if (combined.includes(kw)) {
      regions.add(kw);
    }
  }
  for (const [keyword, canonical] of Object.entries(additionalKeywords)) {
    if (combined.includes(keyword)) {
      regions.add(canonical);
    }
  }

  return Array.from(regions);
}

const MECHANISM_STRUCTURE_TO_REGIONS: Array<[RegExp, string[]]> = [
  [/lumbar|lower back|erector spinae|multifidus/i, ['lumbar', 'spine']],
  [/thoracic|mid back|rhomboid/i, ['thoracic', 'spine']],
  [/cervical|neck|sternocleidomastoid/i, ['cervical', 'neck']],
  [/shoulder|deltoid|rotator|supraspinatus|infraspinatus|scapula/i, ['shoulder']],
  [/hip|glute|gluteus|piriformis|psoas|iliacus/i, ['hip']],
  [/knee|quad|patell|hamstring|vmo/i, ['knee']],
  [/ankle|calf|gastrocnemius|soleus|tibial|achilles/i, ['ankle']],
  [/pelvis|sacrum|sacroiliac|core|pelvic/i, ['pelvis', 'hip']],
  [/elbow|epicondyl|forearm/i, ['elbow']],
  [/wrist|hand|carpal/i, ['wrist']],
];

function mechanismStructureToRegions(structure: string): string[] {
  const results: string[] = [];
  for (const [pattern, regions] of MECHANISM_STRUCTURE_TO_REGIONS) {
    if (pattern.test(structure)) {
      results.push(...regions);
    }
  }
  if (results.length === 0) {
    results.push(structure.toLowerCase().replace(/[^a-z ]/g, '').trim());
  }
  return [...new Set(results)];
}

function computePostureBonus(postureState?: Record<string, Record<string, number>>): number {
  if (!postureState) return 0;
  let totalDeviation = 0;
  for (const group of Object.values(postureState)) {
    for (const value of Object.values(group)) {
      totalDeviation += Math.abs(value);
    }
  }
  return Math.min(10, Math.round(totalDeviation / 5));
}

export function analyzeTreatmentDecision(input: TreatmentDecisionInput): TreatmentDecisionResult {
  const sr = input.structuredReasoning;

  const problemClass = sr.problemClass?.primary || 'mixed';
  const mechanism = sr.dominantMechanism?.mechanism || 'unknown';
  const stage = sr.stage?.stage || 'subacute';
  const irritability = sr.irritability?.level || 'moderate';
  const topHypothesis = sr.hypotheses?.[0]?.condition || 'Unknown presentation';
  const mustNotMissConditions = sr.mustNotMiss?.map(m => m.condition) || [];

  const patientContraindications: string[] = [];
  if (input.muscleOverrides) {
    for (const [, override] of Object.entries(input.muscleOverrides)) {
      if (override.pathology) patientContraindications.push(override.pathology);
    }
  }
  if (input.painMarkers) {
    for (const pm of input.painMarkers) {
      if (pm.type === 'referred') patientContraindications.push('referred pain');
      if (pm.severity && pm.severity >= 8) patientContraindications.push('severe pain');
    }
  }
  const modifierBuckets: Array<{ category?: string; label?: string; modifiers?: string[] }> = sr.modifiers || [];
  for (const bucket of modifierBuckets) {
    if (bucket && Array.isArray(bucket.modifiers)) {
      for (const modStr of bucket.modifiers) {
        const label = modStr.toLowerCase();
        if (label.includes('anticoagulant')) patientContraindications.push('anticoagulant therapy');
        if (label.includes('osteoporo')) patientContraindications.push('osteoporosis');
        if (label.includes('pregnan')) patientContraindications.push('pregnancy (specific regions)');
        if (label.includes('dvt') || label.includes('thrombosis')) patientContraindications.push('DVT');
        if (label.includes('hypermobil')) patientContraindications.push('hypermobility');
        if (label.includes('fracture')) patientContraindications.push('fracture');
        if (label.includes('open wound')) patientContraindications.push('open wounds');
      }
    }
  }

  const ctx = input.extractionContext;
  if (ctx) {
    if (ctx.redFlags?.length) {
      for (const rf of ctx.redFlags) {
        const flag = rf.flag.toLowerCase();
        if (flag.includes('cancer') || flag.includes('malignancy')) patientContraindications.push('cancer history');
        if (flag.includes('fracture') || flag.includes('trauma')) patientContraindications.push('fracture risk');
        if (flag.includes('cauda') || flag.includes('bladder') || flag.includes('bowel')) patientContraindications.push('cauda equina screening required');
        if (flag.includes('steroid')) patientContraindications.push('long-term steroid use');
      }
    }
    if (ctx.priorTreatment) {
      const prior = ctx.priorTreatment.toLowerCase();
      if (prior.includes('surgery') || prior.includes('surgical')) patientContraindications.push('post-surgical');
      if (prior.includes('injection') || prior.includes('cortisone')) patientContraindications.push('recent injection');
    }
    if (ctx.symptomBehaviour?.restPain) {
      patientContraindications.push('rest pain');
    }
    if (ctx.symptomBehaviour?.nightSymptoms) {
      patientContraindications.push('night symptoms');
    }
  }

  const bio = input.biomechanicsContext;
  if (bio?.faults) {
    for (const fault of bio.faults) {
      if (fault.severity === 'severe' || fault.severity === 'moderate') {
        patientContraindications.push(`biomechanical fault: ${fault.label}`);
      }
    }
  }

  const regions = extractRegionsFromReasoning(input);

  const hasRedFlags = (ctx?.redFlags?.length ?? 0) > 0;
  const hasMustNotMiss = mustNotMissConditions.length > 0;

  const { candidates, evidenceResult: cachedEvidenceResult } = buildCandidatesFromEvidenceEngine(regions, problemClass, mechanism, stage, irritability, sr, { hasRedFlags, hasMustNotMiss });

  const postureDeviationScore = computePostureBonus(input.postureState);

  const biomechanicsBonus = bio ? Math.min(15, (bio.faults?.length ?? 0) * 3 + (bio.deviations?.length ?? 0) * 2) : 0;

  const sling = input.slingContext;
  const slingForceTransferDeficit = sling ? Math.max(0, 70 - sling.overallForceTransferScore) : 0;
  const hasSlingDysfunction = sling && sling.dysfunctionalSlings.length > 0;
  const slingNeedsActivation = sling?.dysfunctionalSlings.some(
    s => s.treatmentTargets.some(t => t.intervention === 'activate')
  ) ?? false;
  const slingNeedsRelease = sling?.dysfunctionalSlings.some(
    s => s.treatmentTargets.some(t => t.intervention === 'release')
  ) ?? false;
  const slingNeedsStrengthen = sling?.dysfunctionalSlings.some(
    s => s.treatmentTargets.some(t => t.intervention === 'strengthen')
  ) ?? false;
  const slingCompensationCount = sling?.dysfunctionalSlings.filter(s => s.status === 'compensating').length ?? 0;
  const slingUnderperformingCount = sling?.dysfunctionalSlings.filter(s => s.status === 'underperforming').length ?? 0;

  const mech = input.mechanismContext;
  const hasMechanismContext = mech && mech.topTargets.length > 0;
  const mechRootCauseRegions = mech?.topTargets
    .filter(t => t.category === 'root_cause')
    .flatMap(t => mechanismStructureToRegions(t.structure)) ?? [];
  const mechCompensationRegions = mech?.topTargets
    .filter(t => t.category === 'compensation')
    .flatMap(t => mechanismStructureToRegions(t.structure)) ?? [];
  const mechOverloadCount = mech?.overloadedJointCount ?? 0;

  const postureIsDominant = postureDeviationScore >= 6 && problemClass === 'compression';
  const tierContext = { hasRedFlags, hasMustNotMiss, postureIsDominant };

  const ranked: RankedIntervention[] = candidates.map(candidate => {
    let score = matchScore(candidate, problemClass, mechanism, topHypothesis, regions);

    const specificityBonus = 7 - Math.min(7, candidate.problemClassMatch.length);
    score += specificityBonus;

    const regionOverlap = candidate.targetRegions.filter(r =>
      regions.some(ir => ir.toLowerCase().includes(r) || r.includes(ir.toLowerCase()))
    ).length;
    if (regions.length > 0 && regionOverlap > 0) {
      score += Math.min(18, regionOverlap * 6);
    } else if (regions.length > 0 && regionOverlap === 0 && !candidate.targetRegions.includes('general')) {
      score -= 8;
    }

    const clinicalCategories: InterventionCategory[] = ['manual_therapy', 'exercise', 'load_management'];
    if (clinicalCategories.includes(candidate.category) && candidate.mechanismMatch.includes(mechanism)) {
      score += 8;
    }

    if (postureDeviationScore > 0) {
      if (['stretching_programme', 'motor_control_retraining'].includes(candidate.id)) {
        score += Math.min(10, postureDeviationScore);
      }
    }
    if (biomechanicsBonus > 0) {
      if (['motor_control_retraining', 'progressive_strengthening', 'stretching_programme'].includes(candidate.id)) {
        score += biomechanicsBonus;
      }
    }

    if (hasSlingDysfunction) {
      if (candidate.id === 'motor_control_retraining' && slingNeedsActivation) {
        score += Math.min(20, slingForceTransferDeficit * 0.5 + slingUnderperformingCount * 5);
      }
      if (candidate.id === 'progressive_strengthening' && slingNeedsStrengthen) {
        score += Math.min(15, slingForceTransferDeficit * 0.3 + slingUnderperformingCount * 4);
      }
      if ((candidate.id === 'soft_tissue_release' || candidate.id === 'trigger_point_therapy' || candidate.id === 'dry_needling') && slingNeedsRelease) {
        score += Math.min(12, slingCompensationCount * 4 + slingForceTransferDeficit * 0.2);
      }
      if (candidate.id === 'isometric_loading' && slingNeedsActivation) {
        score += Math.min(10, slingUnderperformingCount * 3);
      }
      if (candidate.id === 'stretching_programme' && slingCompensationCount > 0) {
        score += Math.min(8, slingCompensationCount * 3);
      }
    }

    if (hasMechanismContext) {
      const candidateRegions = candidate.targetRegions.map(r => r.toLowerCase());
      const rootCauseMatch = mechRootCauseRegions.some(r =>
        candidateRegions.some(cr => cr.includes(r) || r.includes(cr))
      );
      const compensationMatch = mechCompensationRegions.some(r =>
        candidateRegions.some(cr => cr.includes(r) || r.includes(cr))
      );
      if (rootCauseMatch) {
        if (['motor_control_retraining', 'progressive_strengthening', 'isometric_loading'].includes(candidate.id)) {
          score += 12;
        } else if (['soft_tissue_release', 'trigger_point_therapy', 'dry_needling'].includes(candidate.id)) {
          score += 10;
        }
      }
      if (compensationMatch) {
        if (['soft_tissue_release', 'trigger_point_therapy', 'stretching_programme'].includes(candidate.id)) {
          score += 8;
        }
        if (['motor_control_retraining'].includes(candidate.id)) {
          score += 6;
        }
      }
      if (mechOverloadCount > 0 && candidate.id === 'load_management_advice') {
        score += Math.min(10, mechOverloadCount * 4);
      }
    }

    const { pass: riskPassed, flags: riskFlags } = riskFilter(candidate, stage, irritability, mustNotMissConditions, patientContraindications);
    const tier = classifyTier(score, riskPassed, candidate, problemClass, tierContext);
    const intent = classifyIntent(candidate, mechanism);
    const explainability = buildExplainability(candidate, tier, score, riskFlags, problemClass, mechanism, stage, irritability);

    const confidence = Math.min(100, Math.round((score / 80) * 100));
    const linkedTechniques = resolveLinkedTechniques(candidate.id);

    return {
      id: candidate.id,
      name: candidate.name,
      category: candidate.category,
      tier,
      intent,
      score,
      confidence,
      expectedTimeframe: candidate.expectedTimeframe,
      description: candidate.description,
      dosage: candidate.dosage,
      rationale: candidate.rationale,
      evidenceGrade: candidate.evidenceGrade,
      targetRegions: candidate.targetRegions.filter(r => regions.length === 0 || regions.some(ir => r.includes(ir) || ir.includes(r))),
      riskFlags,
      explainability,
      stageAppropriate: !candidate.stageRestrictions?.includes(stage),
      irritabilityAppropriate: (() => {
        if (!candidate.irritabilityMax) return true;
        const order: IrritabilityLevel[] = ['low', 'moderate', 'high'];
        return order.indexOf(irritability) <= order.indexOf(candidate.irritabilityMax);
      })(),
      linkedTechniques,
      sourceLibrary: candidate.sourceLibrary,
      expertApproach: candidate.expertApproach,
      references: candidate.references,
      evidenceRelevanceScore: candidate.evidenceRelevanceScore,
      conditionKeywords: candidate.conditionKeywords,
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  const primary = ranked.filter(r => r.tier === 'primary').slice(0, 5);
  const adjunct = ranked.filter(r => r.tier === 'adjunct').slice(0, 5);
  const avoidDefer = ranked.filter(r => r.tier === 'avoid_defer');

  if (primary.length === 0 && adjunct.length > 0) {
    const promoted = adjunct.shift()!;
    promoted.tier = 'primary';
    primary.push(promoted);
  }

  const reviewSchedule = computeReviewSchedule(irritability, stage);

  const mechanismNote = hasMechanismContext
    ? ` Mechanism analysis: ${mech!.rootCauseCount} root cause(s), ${mech!.compensationCount} compensation(s), ${mech!.overloadedJointCount} overloaded joint(s). Top contributors: ${mech!.topContributors.slice(0, 3).join(', ')}.`
    : '';
  const slingNote = hasSlingDysfunction
    ? ` Sling analysis: ${sling!.dysfunctionalSlings.length} dysfunctional sling(s) detected (force transfer ${sling!.overallForceTransferScore}/100), prioritizing force-transfer restoration and compensation reduction.`
    : '';
  const regionNote = regions.length > 0
    ? ` Affected region(s): ${regions.join(', ')}.`
    : '';
  const durationNote = ctx?.duration
    ? ` Duration: ${ctx.duration}.`
    : '';
  const onsetNote = ctx?.onset
    ? ` Onset: ${ctx.onset}.`
    : '';
  const priorTxNote = ctx?.priorTreatment
    ? ` Prior treatment: ${ctx.priorTreatment}.`
    : '';
  const aggravNote = ctx?.aggravatingFactors?.length
    ? ` Aggravated by: ${ctx.aggravatingFactors.slice(0, 3).map(a => a.factor).join(', ')}.`
    : '';
  const decisionSummary = `For ${topHypothesis} (${stage} stage, ${irritability} irritability, ${problemClass.replace(/_/g, ' ')} problem class).${regionNote}${durationNote}${onsetNote}${priorTxNote}${aggravNote} ${primary.length} primary and ${adjunct.length} adjunct interventions recommended. ${avoidDefer.length > 0 ? `${avoidDefer.length} intervention(s) deferred due to stage/irritability constraints.` : 'No interventions deferred.'}${mechanismNote}${slingNote} Reassess in ${reviewSchedule.reassessmentLabel}.`;

  const expertApproaches = new Set<string>();
  for (const opt of cachedEvidenceResult.options) {
    if (opt.expertApproach) expertApproaches.add(opt.expertApproach);
  }
  const evidenceEngineContext: TreatmentDecisionResult['evidenceEngineContext'] = {
    totalEvidenceOptions: cachedEvidenceResult.options.length,
    gradeDistribution: cachedEvidenceResult.gradeDistribution,
    topExpertApproaches: Array.from(expertApproaches).slice(0, 5),
  };

  const topEvidenceOptions: EvidenceOptionForPlan[] = cachedEvidenceResult.options
    .slice(0, 20)
    .map(opt => ({
      id: opt.id,
      name: opt.name,
      dosage: opt.dosage,
      rationale: opt.rationale,
      evidenceGrade: opt.evidenceGrade,
      references: opt.references,
      sourceLibrary: opt.sourceLibrary,
      expertApproach: opt.expertApproach,
      relevanceScore: opt.relevanceScore,
      targetRegions: opt.targetRegions,
    }));

  return {
    primary,
    adjunct,
    avoidDefer,
    reviewSchedule,
    topHypothesis,
    problemClass: sr.problemClass?.label || problemClass,
    mechanism: sr.dominantMechanism?.label || mechanism,
    stage: sr.stage?.label || stage,
    irritability,
    decisionSummary,
    timestamp: new Date().toISOString(),
    mechanismInformed: !!hasMechanismContext,
    evidenceEngineContext,
    topEvidenceOptions,
  };
}
