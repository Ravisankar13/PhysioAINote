import { SHARED_TECHNIQUE_DB, getLinkedEvidenceForCandidate, type ClinicalStatusKey } from '@shared/evidenceReferences';
import type {
  ClinicalReasoningResult,
  ReasoningHypothesis,
  IrritabilityLevel,
  ConditionStageType,
  ProblemClass,
  DominantMechanism,
} from './clinicalReasoningEngine';

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
}

export interface ReviewSchedule {
  reassessmentDays: number;
  reassessmentLabel: string;
  irritabilityBasis: IrritabilityLevel;
  stageBasis: ConditionStageType;
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
  irritability: IrritabilityLevel;
  decisionSummary: string;
  timestamp: string;
}

export interface TreatmentDecisionInput {
  structuredReasoning: ClinicalReasoningResult;
  muscleOverrides?: Record<string, { pathology?: string; tension?: number }>;
  painMarkers?: Array<{ region: string; severity?: number; type?: string }>;
  postureState?: Record<string, Record<string, number>>;
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

const CANDIDATE_LIBRARY: TreatmentCandidate[] = [
  {
    id: 'joint_mob_grade_1_2',
    name: 'Joint Mobilisation (Grade I-II)',
    category: 'manual_therapy',
    description: 'Oscillatory accessory movements within pain-free range for pain modulation and neurophysiological inhibition',
    dosage: '3-5 sets of 30-60s oscillations per segment',
    rationale: 'Grade I-II mobilisations activate descending pain inhibition via large-diameter afferent input (gate control) and reduce sympathetic tone',
    evidenceGrade: 'A',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
    contraindications: ['fracture', 'malignancy', 'active infection', 'vascular compromise'],
    irritabilityMax: 'high',
    expectedTimeframe: 'Immediate pain relief; 2-4 sessions for sustained effect',
    problemClassMatch: ['mobility_restriction', 'compression', 'sensitivity_dominant'],
    mechanismMatch: ['compression', 'stiffness', 'sensitisation'],
  },
  {
    id: 'joint_mob_grade_3_4',
    name: 'Joint Mobilisation (Grade III-IV)',
    category: 'manual_therapy',
    description: 'Large-amplitude accessory movements at end range to restore joint mobility and break adhesion barriers',
    dosage: '3-5 sets of 30s at end-range, reassess ROM between sets',
    rationale: 'End-range mobilisation produces mechanical hysteresis and neurophysiological effects restoring accessory glide',
    evidenceGrade: 'A',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
    contraindications: ['fracture', 'malignancy', 'acute inflammation', 'hypermobility', 'osteoporosis'],
    stageRestrictions: ['acute'],
    irritabilityMax: 'moderate',
    expectedTimeframe: '2-6 weeks for ROM restoration',
    problemClassMatch: ['mobility_restriction', 'compression'],
    mechanismMatch: ['stiffness', 'compression'],
  },
  {
    id: 'soft_tissue_release',
    name: 'Soft Tissue Release / Myofascial Release',
    category: 'manual_therapy',
    description: 'Sustained pressure and longitudinal gliding to reduce fascial restrictions and muscle tone',
    dosage: '3-5 min per area, moderate to deep pressure',
    rationale: 'Thixotropic reduction in fascial viscosity and autogenic inhibition via Golgi tendon organ activation',
    evidenceGrade: 'B',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee'],
    contraindications: ['open wounds', 'DVT', 'acute inflammation'],
    expectedTimeframe: 'Immediate tone reduction; 3-6 sessions for lasting change',
    problemClassMatch: ['mobility_restriction', 'load_capacity', 'compression', 'mixed'],
    mechanismMatch: ['stiffness', 'compression', 'tensile_load'],
    linkedTechniqueDbKeys: ['shortened'],
  },
  {
    id: 'trigger_point_therapy',
    name: 'Trigger Point Pressure Release',
    category: 'manual_therapy',
    description: 'Sustained ischemic compression to deactivate myofascial trigger points and reduce referred pain patterns',
    dosage: '60-90s sustained pressure per point, 3-5 points per session',
    rationale: 'Motor end plate dysfunction reset via ischemic compression and local vasodilation',
    evidenceGrade: 'B',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee'],
    contraindications: ['anticoagulant therapy', 'local infection'],
    expectedTimeframe: '1-3 sessions for acute trigger points; 4-8 for chronic',
    problemClassMatch: ['load_capacity', 'sensitivity_dominant', 'mixed'],
    mechanismMatch: ['tensile_load', 'sensitisation'],
    linkedTechniqueDbKeys: ['overactive'],
  },
  {
    id: 'neural_mobilisation',
    name: 'Neural Mobilisation / Neurodynamics',
    category: 'neural',
    description: 'Slider and tensioner techniques to restore neural tissue mobility and reduce mechanosensitivity',
    dosage: '3 sets of 10-15 gentle oscillations, pain-free range',
    rationale: 'Restores intraneural blood flow and reduces neural mechanosensitivity via axoplasmic flow enhancement',
    evidenceGrade: 'A',
    targetRegions: ['cervical', 'lumbar', 'shoulder', 'hip'],
    contraindications: ['active radiculopathy with progressive deficit', 'cauda equina', 'spinal cord compression'],
    expectedTimeframe: '2-6 weeks for neural desensitisation',
    problemClassMatch: ['compression', 'sensitivity_dominant'],
    mechanismMatch: ['compression', 'sensitisation'],
  },
  {
    id: 'isometric_loading',
    name: 'Isometric Loading Programme',
    category: 'exercise',
    description: 'Sustained isometric contractions for tendon pain modulation and early-stage load introduction',
    dosage: '5 reps × 45s holds at 70% MVC, 3×/day',
    rationale: 'Isometric loading produces cortical inhibition of pain and stimulates tendon matrix remodelling without compressive load',
    evidenceGrade: 'A',
    targetRegions: ['shoulder', 'knee', 'ankle', 'hip', 'elbow'],
    contraindications: ['acute fracture', 'complete tendon rupture'],
    irritabilityMax: 'high',
    expectedTimeframe: 'Immediate analgesic effect (45 min); 2-4 weeks for structural adaptation',
    problemClassMatch: ['load_capacity'],
    mechanismMatch: ['tensile_load'],
    linkedTechniqueDbKeys: ['inhibited'],
  },
  {
    id: 'eccentric_programme',
    name: 'Eccentric Loading Programme',
    category: 'exercise',
    description: 'Progressive eccentric strengthening for tendon remodelling and muscle length-tension restoration',
    dosage: '3 × 15 reps, slow 4s eccentric phase, daily',
    rationale: 'Promotes sarcomere addition in series and collagen realignment via mechanotransduction',
    evidenceGrade: 'A',
    targetRegions: ['shoulder', 'knee', 'ankle', 'hip', 'elbow'],
    contraindications: ['reactive tendinopathy', 'acute inflammation'],
    stageRestrictions: ['acute', 'reactive'],
    irritabilityMax: 'moderate',
    expectedTimeframe: '6-12 weeks for tendon remodelling',
    problemClassMatch: ['load_capacity'],
    mechanismMatch: ['tensile_load'],
    linkedTechniqueDbKeys: ['shortened'],
  },
  {
    id: 'progressive_strengthening',
    name: 'Progressive Resistance Training',
    category: 'exercise',
    description: 'Graded resistance programme targeting identified weak or inhibited muscle groups',
    dosage: '3 × 8-12 reps, RPE 6-8, 3×/week with progressive overload',
    rationale: 'Addresses load capacity deficits through neural adaptation (weeks 1-6) and hypertrophy (weeks 6+)',
    evidenceGrade: 'A',
    targetRegions: ['shoulder', 'hip', 'knee', 'ankle', 'lumbar', 'cervical'],
    contraindications: ['unstable fracture', 'acute inflammatory arthropathy'],
    stageRestrictions: ['acute'],
    irritabilityMax: 'moderate',
    expectedTimeframe: '6-12 weeks for strength gains; 12+ weeks for hypertrophy',
    problemClassMatch: ['load_capacity', 'instability', 'coordination_control'],
    mechanismMatch: ['tensile_load', 'instability', 'motor_control'],
    linkedTechniqueDbKeys: ['weak'],
  },
  {
    id: 'motor_control_retraining',
    name: 'Motor Control Retraining',
    category: 'exercise',
    description: 'Specific re-education of deep stabiliser activation and movement pattern correction',
    dosage: '3 × 10 reps with biofeedback, low load, daily',
    rationale: 'Restores feedforward timing of deep stabilisers (transversus, multifidus, rotator cuff) disrupted by pain inhibition',
    evidenceGrade: 'A',
    targetRegions: ['lumbar', 'cervical', 'shoulder', 'hip', 'knee'],
    contraindications: [],
    irritabilityMax: 'high',
    expectedTimeframe: '4-8 weeks for motor pattern correction',
    problemClassMatch: ['instability', 'coordination_control'],
    mechanismMatch: ['instability', 'motor_control'],
    linkedTechniqueDbKeys: ['inhibited'],
  },
  {
    id: 'graded_exposure',
    name: 'Graded Exposure to Movement',
    category: 'exercise',
    description: 'Systematic desensitisation to feared movements using a hierarchy of progressive exposure',
    dosage: 'Fear hierarchy: 3-5 exposure levels, progress when distress < 3/10',
    rationale: 'Reduces fear-avoidance beliefs and central sensitisation through extinction learning',
    evidenceGrade: 'A',
    targetRegions: ['lumbar', 'cervical', 'thoracic'],
    contraindications: ['structural instability', 'active pathology requiring rest'],
    expectedTimeframe: '4-12 weeks for behavioural change',
    problemClassMatch: ['sensitivity_dominant', 'mixed'],
    mechanismMatch: ['sensitisation', 'motor_control'],
  },
  {
    id: 'pain_neuroscience_education',
    name: 'Pain Neuroscience Education (PNE)',
    category: 'education',
    description: 'Reconceptualisation of pain as a protective output, addressing threat appraisal and central sensitisation',
    dosage: '1-2 structured sessions + handout, reinforce each visit',
    rationale: 'Reduces pain catastrophising and threat perception by targeting cortical representation of danger',
    evidenceGrade: 'A',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee'],
    contraindications: [],
    irritabilityMax: 'high',
    expectedTimeframe: '2-4 weeks for cognitive shift; ongoing reinforcement',
    problemClassMatch: ['sensitivity_dominant', 'mixed'],
    mechanismMatch: ['sensitisation'],
  },
  {
    id: 'activity_modification',
    name: 'Activity & Load Management',
    category: 'load_management',
    description: 'Structured modification of aggravating activities with graded return-to-activity planning',
    dosage: 'Individualised schedule: reduce provocative loads to 70% current capacity, progress 10%/week',
    rationale: 'Allows tissue healing while maintaining activity levels above deconditioning threshold',
    evidenceGrade: 'B',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
    contraindications: [],
    irritabilityMax: 'high',
    expectedTimeframe: 'Immediate reduction in symptoms; 4-8 weeks for graded return',
    problemClassMatch: ['load_capacity', 'compression', 'sensitivity_dominant', 'mixed'],
    mechanismMatch: ['tensile_load', 'compression', 'sensitisation'],
  },
  {
    id: 'stretching_programme',
    name: 'Targeted Stretching Programme',
    category: 'exercise',
    description: 'Static and PNF stretching for identified shortened muscles contributing to movement restriction',
    dosage: '3-4 × 30-60s holds per muscle, daily',
    rationale: 'Viscoelastic creep and sarcomere remodelling to restore optimal length-tension relationship',
    evidenceGrade: 'A',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
    contraindications: ['hypermobility in target region', 'acute muscle tear'],
    stageRestrictions: ['acute'],
    expectedTimeframe: '2-6 weeks for sustained flexibility gains',
    problemClassMatch: ['mobility_restriction'],
    mechanismMatch: ['stiffness'],
    linkedTechniqueDbKeys: ['shortened'],
  },
  {
    id: 'thoracic_manipulation',
    name: 'Thoracic Spine Manipulation (HVLA)',
    category: 'manual_therapy',
    description: 'High-velocity low-amplitude thrust to thoracic spine for rapid neurophysiological pain modulation',
    dosage: '1-2 thrusts per session, reassess immediately',
    rationale: 'Produces immediate hypoalgesic effect via descending inhibition and sympathoexcitatory response',
    evidenceGrade: 'A',
    targetRegions: ['thoracic', 'cervical', 'shoulder'],
    contraindications: ['osteoporosis', 'fracture', 'malignancy', 'vascular disease', 'anticoagulant therapy'],
    stageRestrictions: ['acute'],
    irritabilityMax: 'moderate',
    expectedTimeframe: 'Immediate session effect; 2-4 sessions for lasting change',
    problemClassMatch: ['mobility_restriction', 'compression'],
    mechanismMatch: ['stiffness', 'compression'],
  },
  {
    id: 'taping_support',
    name: 'Therapeutic Taping (Kinesiology / Rigid)',
    category: 'modality',
    description: 'Supportive or facilitative taping for postural correction, proprioceptive cueing, or offloading',
    dosage: 'Applied each session, patient can maintain 2-3 days',
    rationale: 'Cutaneous proprioceptive input alters motor recruitment patterns and provides external postural cue',
    evidenceGrade: 'C',
    targetRegions: ['shoulder', 'knee', 'ankle', 'lumbar', 'cervical'],
    contraindications: ['skin allergy to tape', 'open wounds'],
    irritabilityMax: 'high',
    expectedTimeframe: 'Immediate proprioceptive effect; short-term adjunct',
    problemClassMatch: ['instability', 'coordination_control', 'load_capacity'],
    mechanismMatch: ['instability', 'motor_control', 'tensile_load'],
    linkedTechniqueDbKeys: ['lengthened'],
  },
  {
    id: 'dry_needling',
    name: 'Dry Needling',
    category: 'manual_therapy',
    description: 'Filiform needle insertion into trigger points to elicit local twitch response and reset motor end plate',
    dosage: '2-3 insertions per trigger point, 4-6 points per session',
    rationale: 'Disrupts dysfunctional motor endplate and reduces spontaneous electrical activity at trigger point loci',
    evidenceGrade: 'A',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee'],
    contraindications: ['needle phobia', 'anticoagulant therapy', 'local infection', 'pregnancy (specific regions)'],
    stageRestrictions: ['acute'],
    irritabilityMax: 'moderate',
    expectedTimeframe: '1-3 sessions for acute trigger points; 4-8 for chronic',
    problemClassMatch: ['load_capacity', 'sensitivity_dominant', 'mixed'],
    mechanismMatch: ['tensile_load', 'sensitisation'],
    linkedTechniqueDbKeys: ['overactive'],
  },
  {
    id: 'ergonomic_advice',
    name: 'Ergonomic & Postural Advice',
    category: 'education',
    description: 'Workplace and activity-specific postural optimisation to reduce sustained tissue loading',
    dosage: 'Initial assessment + follow-up review, written action plan',
    rationale: 'Reduces cumulative tissue loading below injury threshold through environmental modification',
    evidenceGrade: 'B',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip'],
    contraindications: [],
    irritabilityMax: 'high',
    expectedTimeframe: 'Immediate behavioural change; 2-4 weeks for habit formation',
    problemClassMatch: ['compression', 'load_capacity', 'mobility_restriction', 'mixed'],
    mechanismMatch: ['compression', 'stiffness', 'tensile_load'],
  },
  {
    id: 'proprioceptive_training',
    name: 'Proprioceptive & Balance Training',
    category: 'exercise',
    description: 'Progressive balance and proprioceptive challenge for joint position sense restoration',
    dosage: '3 × 30-60s per exercise, progress surface instability weekly',
    rationale: 'Restores mechanoreceptor-mediated joint position sense disrupted by injury or deconditioning',
    evidenceGrade: 'A',
    targetRegions: ['ankle', 'knee', 'hip', 'lumbar'],
    contraindications: ['acute fracture', 'severe vestibular dysfunction'],
    stageRestrictions: ['acute'],
    expectedTimeframe: '4-8 weeks for proprioceptive restoration',
    problemClassMatch: ['instability', 'coordination_control'],
    mechanismMatch: ['instability', 'motor_control'],
  },
  {
    id: 'hydrotherapy',
    name: 'Aquatic Therapy / Hydrotherapy',
    category: 'exercise',
    description: 'Water-based exercise programme utilising buoyancy for offloaded strengthening and ROM',
    dosage: '30-45 min sessions, 2-3×/week',
    rationale: 'Buoyancy reduces joint loading by 50-90% while hydrostatic pressure aids circulation and edema reduction',
    evidenceGrade: 'B',
    targetRegions: ['lumbar', 'hip', 'knee', 'ankle', 'shoulder'],
    contraindications: ['open wounds', 'uncontrolled cardiac conditions', 'urinary incontinence'],
    irritabilityMax: 'high',
    expectedTimeframe: '4-8 weeks for functional improvement',
    problemClassMatch: ['load_capacity', 'mobility_restriction', 'sensitivity_dominant'],
    mechanismMatch: ['compression', 'tensile_load', 'sensitisation'],
  },
  {
    id: 'refer_imaging',
    name: 'Refer for Imaging / Specialist Review',
    category: 'pharmacological_referral',
    description: 'Onward referral when red flags are present, diagnosis uncertain, or conservative management plateaus',
    dosage: 'Urgent (red flags) or routine (6-12 week plateau)',
    rationale: 'Clinical governance: imaging or specialist assessment when conservative management is insufficient or unsafe',
    evidenceGrade: 'Expert',
    targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
    contraindications: [],
    irritabilityMax: 'high',
    expectedTimeframe: 'Urgent: within 24-48 hours; Routine: 2-6 weeks',
    problemClassMatch: ['compression', 'instability', 'sensitivity_dominant', 'mixed', 'load_capacity', 'mobility_restriction', 'coordination_control'],
    mechanismMatch: ['compression', 'tensile_load', 'instability', 'stiffness', 'motor_control', 'sensitisation', 'unknown'],
  },
];

function buildCandidates(
  regions: string[],
  problemClass: ProblemClass,
  mechanism: DominantMechanism,
): TreatmentCandidate[] {
  return CANDIDATE_LIBRARY.filter(c => {
    const regionMatch = regions.length === 0 || c.targetRegions.some(r => regions.some(ir => ir.toLowerCase().includes(r) || r.includes(ir.toLowerCase())));
    const classMatch = c.problemClassMatch.includes(problemClass) || c.problemClassMatch.includes('mixed');
    const mechMatch = c.mechanismMatch.includes(mechanism) || c.mechanismMatch.includes('unknown');
    return regionMatch && (classMatch || mechMatch);
  });
}

function matchScore(candidate: TreatmentCandidate, problemClass: ProblemClass, mechanism: DominantMechanism): number {
  let score = 0;
  if (candidate.problemClassMatch.includes(problemClass)) score += 30;
  if (candidate.mechanismMatch.includes(mechanism)) score += 30;
  if (candidate.evidenceGrade === 'A') score += 20;
  else if (candidate.evidenceGrade === 'B') score += 12;
  else if (candidate.evidenceGrade === 'C') score += 5;
  else score += 2;
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
): InterventionTier {
  if (!riskPassed) return 'avoid_defer';
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
  if (tier === 'avoid_defer') {
    reasons.push(...riskFlags);
  }
  if (tier === 'primary') {
    reasons.push(`High match score (${score}/80) — selected as primary intervention`);
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
  if (input.painMarkers) {
    for (const pm of input.painMarkers) {
      if (pm.region) regions.add(pm.region.toLowerCase());
    }
  }
  const text = input.structuredReasoning?.reasoningLayers?.presentation || '';
  const regionKeywords = ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle', 'elbow', 'wrist'];
  for (const kw of regionKeywords) {
    if (text.toLowerCase().includes(kw)) regions.add(kw);
  }
  return Array.from(regions);
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

  const regions = extractRegionsFromReasoning(input);

  const candidates = buildCandidates(regions, problemClass, mechanism);

  const postureDeviationScore = computePostureBonus(input.postureState);

  const ranked: RankedIntervention[] = candidates.map(candidate => {
    let score = matchScore(candidate, problemClass, mechanism);
    if (postureDeviationScore > 0) {
      if (['stretching_programme', 'motor_control_retraining', 'ergonomic_advice'].includes(candidate.id)) {
        score += Math.min(10, postureDeviationScore);
      }
    }
    const { pass: riskPassed, flags: riskFlags } = riskFilter(candidate, stage, irritability, mustNotMissConditions, patientContraindications);
    const tier = classifyTier(score, riskPassed, candidate, problemClass);
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

  const decisionSummary = `For ${topHypothesis} (${stage} stage, ${irritability} irritability, ${problemClass.replace(/_/g, ' ')} problem class): ${primary.length} primary and ${adjunct.length} adjunct interventions recommended. ${avoidDefer.length > 0 ? `${avoidDefer.length} intervention(s) deferred due to stage/irritability constraints.` : 'No interventions deferred.'} Reassess in ${reviewSchedule.reassessmentLabel}.`;

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
  };
}
