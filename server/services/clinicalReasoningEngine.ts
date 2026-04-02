import { openai } from '../openai';

export type ProblemClass =
  | 'mobility_restriction'
  | 'load_capacity'
  | 'compression'
  | 'instability'
  | 'coordination_control'
  | 'sensitivity_dominant'
  | 'mixed';

export type DominantMechanism =
  | 'compression'
  | 'tensile_load'
  | 'instability'
  | 'stiffness'
  | 'motor_control'
  | 'sensitisation'
  | 'unknown';

export type IrritabilityLevel = 'low' | 'moderate' | 'high';

export type ConditionStageType =
  | 'acute'
  | 'subacute'
  | 'chronic'
  | 'chronic_recurrent'
  | 'chronic_sensitised'
  | 'freezing'
  | 'frozen'
  | 'thawing'
  | 'reactive'
  | 'disrepair'
  | 'degenerative';

export interface WeightedEvidence {
  feature: string;
  weight: number;
  present: boolean;
}

export interface ClinicalFingerprint {
  id: string;
  condition: string;
  features: WeightedEvidence[];
  typicalProblemClass: ProblemClass;
  typicalMechanism: DominantMechanism;
  conditionStages?: ConditionStageType[];
}

export interface ReasoningHypothesis {
  id: string;
  condition: string;
  confidence: number;
  supporting: { feature: string; weight: number }[];
  contradicting: { feature: string; weight: number }[];
  fingerprintMatchScore: number;
  structuralHypothesis: string;
  dominantClinicalDriver: string;
}

export interface IrritabilityAssessment {
  level: IrritabilityLevel;
  score: number;
  reasons: string[];
}

export interface ConditionStage {
  stage: ConditionStageType;
  label: string;
  conditionSpecific: boolean;
  reasoning: string;
}

export interface ModifierBucket {
  category: 'load' | 'behavioural' | 'recovery' | 'structural' | 'context';
  label: string;
  modifiers: string[];
}

export interface MustNotMissCondition {
  condition: string;
  likelihood: 'low' | 'moderate' | 'unclear' | 'possible';
  reasoning: string;
  screeningNeeded: string[];
}

export interface MissingDataItem {
  question: string;
  purpose: string;
  priority: number;
  category: 'subjective' | 'objective' | 'history' | 'screening';
}

export interface ClinicalReasoningResult {
  hypotheses: ReasoningHypothesis[];
  dominantSymptomDriver: {
    driver: string;
    mechanism: string;
    reasoning: string;
  };
  irritability: IrritabilityAssessment;
  stage: ConditionStage;
  problemClass: {
    primary: ProblemClass;
    secondary?: ProblemClass;
    label: string;
  };
  dominantMechanism: {
    mechanism: DominantMechanism;
    label: string;
    reasoning: string;
  };
  modifiers: ModifierBucket[];
  mustNotMiss: MustNotMissCondition[];
  missingData: MissingDataItem[];
  reasoningLayers: {
    presentation: string;
    symptomPattern: string;
    mechanismPattern: string;
    tissueFamilySuspicion: string;
    differentialSummary: string;
  };
  timestamp: string;
}

export interface ClinicalReasoningInput {
  subjectiveHistory: string;
  symptoms?: string[];
  aggravatingFactors?: string[];
  easingFactors?: string[];
  painMarkers?: Array<{
    region: string;
    severity?: number;
    type?: string;
    mechanism?: string;
  }>;
  postureState?: Record<string, Record<string, number>>;
  muscleOverrides?: Record<string, { pathology?: string; tension?: number }>;
  biomechanicalData?: {
    forces?: Array<{ label: string; totalForce: number; status: string }>;
    muscles?: Array<{ name: string; status: string; activation: number }>;
  };
  duration?: string;
  onset?: string;
  previousEpisodes?: boolean;
  nightPain?: boolean;
  restingPain?: boolean;
  sleepAffected?: boolean;
}

const CLINICAL_FINGERPRINTS: ClinicalFingerprint[] = [
  {
    id: 'discogenic_lbp',
    condition: 'Discogenic Low Back Pain',
    typicalProblemClass: 'compression',
    typicalMechanism: 'compression',
    features: [
      { feature: 'flexion/lifting mechanism', weight: 3, present: false },
      { feature: 'sitting aggravates', weight: 2, present: false },
      { feature: 'bending aggravates', weight: 2, present: false },
      { feature: 'mechanical pain pattern', weight: 1.5, present: false },
      { feature: 'leg referral/radiculopathy', weight: 1, present: false },
      { feature: 'stiffness after sitting', weight: 1.5, present: false },
      { feature: 'morning stiffness', weight: 1, present: false },
      { feature: 'pure extension pain', weight: -2, present: false },
      { feature: 'gross instability features', weight: -2, present: false },
    ],
  },
  {
    id: 'frozen_shoulder',
    condition: 'Adhesive Capsulitis (Frozen Shoulder)',
    typicalProblemClass: 'mobility_restriction',
    typicalMechanism: 'stiffness',
    conditionStages: ['freezing', 'frozen', 'thawing'],
    features: [
      { feature: 'gradual onset', weight: 2, present: false },
      { feature: 'age 40-60', weight: 1.5, present: false },
      { feature: 'progressive stiffness', weight: 3, present: false },
      { feature: 'external rotation loss', weight: 3, present: false },
      { feature: 'night pain', weight: 2, present: false },
      { feature: 'active and passive restriction equal', weight: 2.5, present: false },
      { feature: 'capsular pattern', weight: 2, present: false },
      { feature: 'traumatic onset', weight: -1.5, present: false },
      { feature: 'isolated weakness without ROM loss', weight: -2, present: false },
    ],
  },
  {
    id: 'rotator_cuff_tear',
    condition: 'Rotator Cuff Tear',
    typicalProblemClass: 'load_capacity',
    typicalMechanism: 'tensile_load',
    features: [
      { feature: 'weakness on testing', weight: 3, present: false },
      { feature: 'painful arc', weight: 2, present: false },
      { feature: 'overhead pain', weight: 2, present: false },
      { feature: 'traumatic or degenerative onset', weight: 1.5, present: false },
      { feature: 'night pain', weight: 1.5, present: false },
      { feature: 'poor active function', weight: 2, present: false },
      { feature: 'age over 50', weight: 1, present: false },
      { feature: 'capsular pattern restriction', weight: -2, present: false },
    ],
  },
  {
    id: 'baastrup',
    condition: "Baastrup's Disease (Kissing Spines)",
    typicalProblemClass: 'compression',
    typicalMechanism: 'compression',
    features: [
      { feature: 'extension aggravated', weight: 3, present: false },
      { feature: 'hyperlordosis', weight: 2.5, present: false },
      { feature: 'standing/walking pain', weight: 2, present: false },
      { feature: 'relief in flexion', weight: 2, present: false },
      { feature: 'chronic extension strategy', weight: 1.5, present: false },
      { feature: 'midline tenderness', weight: 1.5, present: false },
      { feature: 'flexion aggravates', weight: -2, present: false },
    ],
  },
  {
    id: 'lateral_epicondylalgia',
    condition: 'Lateral Epicondylalgia (Tennis Elbow)',
    typicalProblemClass: 'load_capacity',
    typicalMechanism: 'tensile_load',
    features: [
      { feature: 'lateral elbow pain', weight: 3, present: false },
      { feature: 'grip weakness', weight: 2.5, present: false },
      { feature: 'pain with wrist extension', weight: 2, present: false },
      { feature: 'repetitive strain mechanism', weight: 2, present: false },
      { feature: 'tenderness over lateral epicondyle', weight: 2, present: false },
      { feature: 'gradual onset', weight: 1, present: false },
      { feature: 'medial elbow pain', weight: -2, present: false },
    ],
  },
  {
    id: 'patellofemoral_pain',
    condition: 'Patellofemoral Pain Syndrome',
    typicalProblemClass: 'load_capacity',
    typicalMechanism: 'compression',
    features: [
      { feature: 'anterior knee pain', weight: 3, present: false },
      { feature: 'stairs aggravate', weight: 2.5, present: false },
      { feature: 'prolonged sitting aggravates', weight: 2, present: false },
      { feature: 'squatting aggravates', weight: 2, present: false },
      { feature: 'gradual onset', weight: 1, present: false },
      { feature: 'VMO weakness', weight: 1.5, present: false },
      { feature: 'locking/giving way', weight: -1.5, present: false },
    ],
  },
  {
    id: 'achilles_tendinopathy',
    condition: 'Achilles Tendinopathy',
    typicalProblemClass: 'load_capacity',
    typicalMechanism: 'tensile_load',
    conditionStages: ['reactive', 'disrepair', 'degenerative'],
    features: [
      { feature: 'posterior heel/ankle pain', weight: 3, present: false },
      { feature: 'morning stiffness in tendon', weight: 2.5, present: false },
      { feature: 'pain with loading (running/jumping)', weight: 2.5, present: false },
      { feature: 'warm-up phenomenon', weight: 2, present: false },
      { feature: 'tendon thickening', weight: 2, present: false },
      { feature: 'training load spike', weight: 1.5, present: false },
      { feature: 'sudden traumatic onset', weight: -2, present: false },
    ],
  },
  {
    id: 'cervical_radiculopathy',
    condition: 'Cervical Radiculopathy',
    typicalProblemClass: 'compression',
    typicalMechanism: 'compression',
    features: [
      { feature: 'arm pain in dermatomal pattern', weight: 3, present: false },
      { feature: 'neck pain', weight: 1.5, present: false },
      { feature: 'numbness/tingling in arm', weight: 2.5, present: false },
      { feature: 'weakness in myotomal pattern', weight: 2.5, present: false },
      { feature: 'positive Spurling test', weight: 2, present: false },
      { feature: 'cervical extension aggravates', weight: 1.5, present: false },
      { feature: 'bilateral symptoms', weight: -2, present: false },
    ],
  },
  {
    id: 'hip_oa',
    condition: 'Hip Osteoarthritis',
    typicalProblemClass: 'mobility_restriction',
    typicalMechanism: 'compression',
    conditionStages: ['acute', 'subacute', 'chronic'],
    features: [
      { feature: 'groin pain', weight: 3, present: false },
      { feature: 'age over 50', weight: 2, present: false },
      { feature: 'stiffness after rest', weight: 2, present: false },
      { feature: 'reduced internal rotation', weight: 2.5, present: false },
      { feature: 'capsular pattern restriction', weight: 2, present: false },
      { feature: 'gradual onset', weight: 1.5, present: false },
      { feature: 'crepitus', weight: 1, present: false },
      { feature: 'lateral hip pain only', weight: -1.5, present: false },
    ],
  },
  {
    id: 'gluteal_tendinopathy',
    condition: 'Gluteal Tendinopathy / GTPS',
    typicalProblemClass: 'load_capacity',
    typicalMechanism: 'tensile_load',
    conditionStages: ['reactive', 'disrepair', 'degenerative'],
    features: [
      { feature: 'lateral hip pain', weight: 3, present: false },
      { feature: 'pain lying on side', weight: 2.5, present: false },
      { feature: 'stair climbing aggravates', weight: 2, present: false },
      { feature: 'single leg stance pain', weight: 2, present: false },
      { feature: 'positive resisted external derotation', weight: 2, present: false },
      { feature: 'female over 40', weight: 1, present: false },
      { feature: 'groin pain primary', weight: -2, present: false },
    ],
  },
  {
    id: 'lumbar_spinal_stenosis',
    condition: 'Lumbar Spinal Stenosis',
    typicalProblemClass: 'compression',
    typicalMechanism: 'compression',
    features: [
      { feature: 'bilateral leg symptoms', weight: 3, present: false },
      { feature: 'walking aggravates', weight: 2.5, present: false },
      { feature: 'sitting relieves', weight: 2, present: false },
      { feature: 'flexion preference', weight: 2, present: false },
      { feature: 'age over 60', weight: 1.5, present: false },
      { feature: 'neurogenic claudication', weight: 2.5, present: false },
      { feature: 'unilateral dermatomal symptoms', weight: -1.5, present: false },
    ],
  },
  {
    id: 'facet_joint_pain',
    condition: 'Facet Joint Mediated Pain',
    typicalProblemClass: 'compression',
    typicalMechanism: 'compression',
    features: [
      { feature: 'extension aggravated', weight: 3, present: false },
      { feature: 'rotation aggravated', weight: 2, present: false },
      { feature: 'unilateral back pain', weight: 2, present: false },
      { feature: 'local tenderness over facets', weight: 2, present: false },
      { feature: 'referred pain to buttock/thigh', weight: 1.5, present: false },
      { feature: 'morning stiffness', weight: 1, present: false },
      { feature: 'flexion aggravates primarily', weight: -2, present: false },
      { feature: 'dermatomal leg symptoms', weight: -2, present: false },
    ],
  },
];

function matchFingerprints(input: ClinicalReasoningInput): Array<{ fingerprint: ClinicalFingerprint; score: number; maxPossible: number; matched: WeightedEvidence[]; contradicted: WeightedEvidence[] }> {
  const text = buildSearchText(input);

  return CLINICAL_FINGERPRINTS.map(fp => {
    let score = 0;
    let maxPossible = 0;
    const matched: WeightedEvidence[] = [];
    const contradicted: WeightedEvidence[] = [];

    for (const f of fp.features) {
      if (f.weight > 0) maxPossible += f.weight;
      const present = isFeaturePresent(f.feature, text, input);
      if (present && f.weight > 0) {
        score += f.weight;
        matched.push({ ...f, present: true });
      } else if (present && f.weight < 0) {
        score += f.weight;
        contradicted.push({ ...f, present: true });
      }
    }

    return { fingerprint: fp, score, maxPossible, matched, contradicted };
  })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

function buildSearchText(input: ClinicalReasoningInput): string {
  const parts: string[] = [];
  if (input.subjectiveHistory) parts.push(input.subjectiveHistory);
  if (input.symptoms) parts.push(input.symptoms.join(' '));
  if (input.aggravatingFactors) parts.push(input.aggravatingFactors.join(' '));
  if (input.easingFactors) parts.push(input.easingFactors.join(' '));
  if (input.painMarkers) parts.push(input.painMarkers.map(p => `${p.region} ${p.type || ''} ${p.mechanism || ''}`).join(' '));
  if (input.onset) parts.push(input.onset);
  if (input.duration) parts.push(input.duration);
  if (input.nightPain) parts.push('night pain');
  if (input.restingPain) parts.push('resting pain rest pain');
  if (input.sleepAffected) parts.push('sleep affected sleep disturbance');
  if (input.previousEpisodes) parts.push('previous episodes recurrent');
  if (input.postureState) {
    for (const [group, vals] of Object.entries(input.postureState)) {
      for (const [param, val] of Object.entries(vals)) {
        if (Math.abs(val) > 5) {
          const direction = val > 0 ? 'increased' : 'decreased';
          parts.push(`${direction} ${group} ${param}`);
          if (group === 'spine' && param === 'lumbarLordosis' && val > 10) parts.push('hyperlordosis');
          if (group === 'spine' && param === 'thoracicKyphosis' && val > 10) parts.push('hyperkyphosis');
          if (group === 'spine' && param === 'forwardHead' && val > 5) parts.push('forward head posture');
        }
      }
    }
  }
  return parts.join(' ').toLowerCase();
}

function isFeaturePresent(feature: string, text: string, input: ClinicalReasoningInput): boolean {
  const featureLower = feature.toLowerCase();
  const keywords = featureLower.split(/[\/\s]+/).filter(k => k.length > 2);

  if (keywords.length <= 2) {
    return keywords.every(k => text.includes(k));
  }

  let matchCount = 0;
  for (const k of keywords) {
    if (text.includes(k)) matchCount++;
  }
  return matchCount >= Math.ceil(keywords.length * 0.6);
}

function assessIrritability(input: ClinicalReasoningInput): IrritabilityAssessment {
  let score = 0;
  const reasons: string[] = [];

  if (input.nightPain) { score += 25; reasons.push('Night pain present'); }
  if (input.restingPain) { score += 20; reasons.push('Resting pain present'); }
  if (input.sleepAffected) { score += 15; reasons.push('Sleep disturbance'); }

  const text = buildSearchText(input);
  if (text.includes('constant pain') || text.includes('pain all the time')) { score += 15; reasons.push('Constant pain reported'); }
  if (text.includes('minor movement') || text.includes('easily aggravated') || text.includes('minimal activity')) { score += 15; reasons.push('Aggravated by minor movement'); }
  if (text.includes('takes long to settle') || text.includes('hours to settle') || text.includes('24h to settle') || text.includes('slow to settle')) { score += 15; reasons.push('Takes extended time to settle (>24h)'); }
  if (text.includes('severe pain') || text.includes('intense pain') || text.includes('pain 8') || text.includes('pain 9') || text.includes('pain 10')) { score += 10; reasons.push('High pain severity'); }

  const painSeverities = input.painMarkers?.map(p => p.severity ?? 0) || [];
  const maxSeverity = Math.max(0, ...painSeverities);
  if (maxSeverity >= 7) { score += 10; reasons.push('Pain marker severity >= 7/10'); }

  if (reasons.length === 0) reasons.push('No significant irritability indicators detected');

  const level: IrritabilityLevel = score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'low';
  return { level, score: Math.min(100, score), reasons };
}

function determineStage(input: ClinicalReasoningInput, topFingerprint: ClinicalFingerprint | null): ConditionStage {
  const text = buildSearchText(input);
  const duration = input.duration?.toLowerCase() || '';

  if (topFingerprint?.conditionStages) {
    const stages = topFingerprint.conditionStages;
    if (topFingerprint.id === 'frozen_shoulder') {
      if (text.includes('thaw') || text.includes('improving range') || text.includes('getting better')) {
        return { stage: 'thawing', label: 'Thawing Phase', conditionSpecific: true, reasoning: 'ROM improving, suggesting thawing phase of adhesive capsulitis' };
      }
      if (text.includes('frozen') || text.includes('stuck') || text.includes('very stiff') || text.includes('no movement')) {
        return { stage: 'frozen', label: 'Frozen Phase', conditionSpecific: true, reasoning: 'Significant ROM restriction with reduced pain, suggesting frozen phase' };
      }
      return { stage: 'freezing', label: 'Freezing Phase', conditionSpecific: true, reasoning: 'Progressive stiffness with pain, suggesting freezing phase of adhesive capsulitis' };
    }
    if (stages.includes('reactive') || stages.includes('disrepair') || stages.includes('degenerative')) {
      if (text.includes('reactive') || text.includes('acute flare') || text.includes('sudden increase')) {
        return { stage: 'reactive', label: 'Reactive Stage', conditionSpecific: true, reasoning: 'Acute tendon response to overload, suggesting reactive tendinopathy (Cook staging)' };
      }
      if (text.includes('degenerat') || text.includes('chronic long') || duration.includes('year')) {
        return { stage: 'degenerative', label: 'Degenerative Stage', conditionSpecific: true, reasoning: 'Long-standing tendon changes with structural deterioration (Cook staging)' };
      }
      if (duration.includes('month') || text.includes('on and off')) {
        return { stage: 'disrepair', label: 'Disrepair Stage', conditionSpecific: true, reasoning: 'Tendon attempting repair with ongoing load issues (Cook staging)' };
      }
    }
  }

  if (duration.includes('week') || duration.includes('day') || duration.includes('less than') || text.includes('acute') || text.includes('just happened') || text.includes('recent injury')) {
    return { stage: 'acute', label: 'Acute', conditionSpecific: false, reasoning: 'Duration suggests acute tissue-dominant phase' };
  }
  if (duration.includes('1-3 month') || duration.includes('few weeks') || text.includes('subacute') || text.includes('recovering')) {
    return { stage: 'subacute', label: 'Subacute', conditionSpecific: false, reasoning: 'Duration and presentation suggest subacute recovery phase' };
  }
  if (text.includes('flare') || text.includes('recurrent') || text.includes('keeps coming back') || input.previousEpisodes) {
    return { stage: 'chronic_recurrent', label: 'Chronic Recurrent', conditionSpecific: false, reasoning: 'History of recurrent episodes suggests chronic recurrent pattern' };
  }
  if (text.includes('sensitis') || text.includes('central') || text.includes('widespread') || text.includes('allodynia')) {
    return { stage: 'chronic_sensitised', label: 'Chronic Sensitised', conditionSpecific: false, reasoning: 'Features suggest central sensitisation as a dominant component' };
  }
  if (duration.includes('month') || duration.includes('year') || text.includes('chronic') || text.includes('long time')) {
    return { stage: 'chronic', label: 'Chronic', conditionSpecific: false, reasoning: 'Duration exceeds expected healing timeframes' };
  }

  return { stage: 'acute', label: 'Acute (Assumed)', conditionSpecific: false, reasoning: 'Insufficient duration data — defaulting to acute' };
}

function detectModifiers(input: ClinicalReasoningInput): ModifierBucket[] {
  const text = buildSearchText(input);
  const buckets: ModifierBucket[] = [];

  const loadMods: string[] = [];
  if (text.includes('training') || text.includes('increased load') || text.includes('spike')) loadMods.push('Recent training/load spike');
  if (text.includes('repetitive') || text.includes('overuse') || text.includes('repeated')) loadMods.push('Repetitive strain');
  if (text.includes('decondition') || text.includes('sedentary') || text.includes('inactive')) loadMods.push('Deconditioning');
  if (loadMods.length > 0) buckets.push({ category: 'load', label: 'Load Modifiers', modifiers: loadMods });

  const behaviourMods: string[] = [];
  if (text.includes('fear') || text.includes('afraid') || text.includes('avoid')) behaviourMods.push('Fear avoidance behaviour');
  if (text.includes('guard') || text.includes('protective') || text.includes('brace')) behaviourMods.push('Movement guarding');
  if (text.includes('won\'t do') || text.includes('doesn\'t do') || text.includes('non-complian') || text.includes('adherence')) behaviourMods.push('Poor adherence risk');
  if (text.includes('catastroph') || text.includes('worst case') || text.includes('never get better')) behaviourMods.push('Catastrophising thoughts');
  if (behaviourMods.length > 0) buckets.push({ category: 'behavioural', label: 'Behavioural Modifiers', modifiers: behaviourMods });

  const recoveryMods: string[] = [];
  if (text.includes('sleep') || text.includes('insomnia') || input.sleepAffected) recoveryMods.push('Sleep issues');
  if (text.includes('persistent pain') || text.includes('chronic pain') || text.includes('long history')) recoveryMods.push('Persistent pain history');
  if (text.includes('flare') || text.includes('keeps coming back') || input.previousEpisodes) recoveryMods.push('Repeated flare-ups');
  if (text.includes('stress') || text.includes('anxiety') || text.includes('depression')) recoveryMods.push('Psychosocial stressors');
  if (recoveryMods.length > 0) buckets.push({ category: 'recovery', label: 'Recovery Modifiers', modifiers: recoveryMods });

  const structuralMods: string[] = [];
  if (text.includes('surgery') || text.includes('operation') || text.includes('post-op')) structuralMods.push('Prior surgery');
  if (text.includes('imaging') || text.includes('mri') || text.includes('x-ray') || text.includes('scan')) structuralMods.push('Imaging findings available');
  if (text.includes('recurrent') || input.previousEpisodes) structuralMods.push('Recurrent episodes');
  if (text.includes('degener') || text.includes('arthritis') || text.includes('wear')) structuralMods.push('Degenerative changes');
  if (structuralMods.length > 0) buckets.push({ category: 'structural', label: 'Structural Modifiers', modifiers: structuralMods });

  const contextMods: string[] = [];
  if (text.includes('sport') || text.includes('athlete') || text.includes('competition') || text.includes('game')) contextMods.push('Sport demands');
  if (text.includes('work') || text.includes('job') || text.includes('occupation') || text.includes('manual')) contextMods.push('Work demands');
  if (text.includes('lift') || text.includes('carry') || text.includes('heavy')) contextMods.push('Lifting requirements');
  if (text.includes('child') || text.includes('care') || text.includes('dependent')) contextMods.push('Caring responsibilities');
  if (contextMods.length > 0) buckets.push({ category: 'context', label: 'Context Modifiers', modifiers: contextMods });

  return buckets;
}

function detectMustNotMiss(input: ClinicalReasoningInput): MustNotMissCondition[] {
  const text = buildSearchText(input);
  const conditions: MustNotMissCondition[] = [];

  const checks: Array<{ condition: string; keywords: string[]; screening: string[] }> = [
    { condition: 'Cauda Equina Syndrome', keywords: ['saddle', 'bowel', 'bladder', 'bilateral leg', 'perineal'], screening: ['Perineal sensation', 'Bladder function', 'Anal tone', 'Bilateral lower limb neurology'] },
    { condition: 'Fracture', keywords: ['fall', 'trauma', 'impact', 'osteoporo', 'steroid', 'fracture', 'broke'], screening: ['Ottawa rules', 'Point tenderness', 'Deformity assessment', 'Imaging if indicated'] },
    { condition: 'Infection', keywords: ['fever', 'temperature', 'chills', 'swollen red', 'immunocomp', 'iv drug', 'wound'], screening: ['Temperature', 'Blood markers (CRP/ESR)', 'Skin inspection', 'History of immunosuppression'] },
    { condition: 'Inflammatory Arthropathy', keywords: ['morning stiffness >30', 'multiple joint', 'symmetric', 'psoriasis', 'inflammatory'], screening: ['Duration of morning stiffness', 'Joint distribution pattern', 'Family history', 'Blood markers'] },
    { condition: 'Malignancy', keywords: ['weight loss', 'night sweat', 'history of cancer', 'unexplained', 'bone pain at night', 'constant pain worse at night'], screening: ['Weight history', 'Night pain character', 'Cancer history', 'Constitutional symptoms'] },
    { condition: 'Vascular Compromise', keywords: ['pulse', 'cold', 'blue', 'dvt', 'calf swelling', 'chest pain'], screening: ['Peripheral pulses', 'Skin colour/temperature', 'Wells score if applicable', 'Calf circumference'] },
    { condition: 'Progressive Neurological Deficit', keywords: ['getting weaker', 'progressive weakness', 'worsening numbness', 'drop foot', 'myelopathy'], screening: ['Serial neurological examination', 'Myotomal strength testing', 'Reflex changes', 'Upper motor neuron signs'] },
    { condition: 'Cervical Myelopathy', keywords: ['clumsy hands', 'gait unsteady', 'bilateral hand', 'lhermitte', 'hyperreflexia', 'spastic'], screening: ['Hoffmann sign', 'Clonus', 'Gait assessment', 'Hand dexterity testing'] },
  ];

  for (const check of checks) {
    const matchCount = check.keywords.filter(k => text.includes(k)).length;
    let likelihood: MustNotMissCondition['likelihood'] = 'low';
    if (matchCount >= 3) likelihood = 'possible';
    else if (matchCount >= 2) likelihood = 'moderate';
    else if (matchCount >= 1) likelihood = 'unclear';

    const matchedKeywords = check.keywords.filter(k => text.includes(k));
    const reasoning = matchCount > 0
      ? `Features noted: ${matchedKeywords.join(', ')}. Screening recommended.`
      : 'No specific indicators detected, but routine screening is good practice.';

    conditions.push({
      condition: check.condition,
      likelihood,
      reasoning,
      screeningNeeded: matchCount > 0 ? check.screening : check.screening.slice(0, 1),
    });
  }

  return conditions.sort((a, b) => {
    const order = { possible: 0, moderate: 1, unclear: 2, low: 3 };
    return order[a.likelihood] - order[b.likelihood];
  });
}

function determineProblemClass(text: string, topFingerprint: ClinicalFingerprint | null): { primary: ProblemClass; secondary?: ProblemClass; label: string } {
  if (topFingerprint) {
    return { primary: topFingerprint.typicalProblemClass, label: PROBLEM_CLASS_LABELS[topFingerprint.typicalProblemClass] };
  }
  if (text.includes('stiff') || text.includes('restricted') || text.includes('can\'t move') || text.includes('rom loss')) {
    return { primary: 'mobility_restriction', label: 'Mobility Restriction Problem' };
  }
  if (text.includes('weak') || text.includes('can\'t hold') || text.includes('gives way') || text.includes('fatigues')) {
    return { primary: 'load_capacity', label: 'Load-Capacity Problem' };
  }
  if (text.includes('compress') || text.includes('sit') || text.includes('weight bearing')) {
    return { primary: 'compression', label: 'Compression Problem' };
  }
  if (text.includes('unstable') || text.includes('slipping') || text.includes('giving way')) {
    return { primary: 'instability', label: 'Instability Problem' };
  }
  if (text.includes('control') || text.includes('coordination') || text.includes('timing') || text.includes('recruitment')) {
    return { primary: 'coordination_control', label: 'Coordination/Control Problem' };
  }
  if (text.includes('sensiti') || text.includes('central') || text.includes('widespread') || text.includes('allodynia')) {
    return { primary: 'sensitivity_dominant', label: 'Sensitivity-Dominant Problem' };
  }
  return { primary: 'mixed', label: 'Mixed Problem' };
}

const PROBLEM_CLASS_LABELS: Record<ProblemClass, string> = {
  mobility_restriction: 'Mobility Restriction Problem',
  load_capacity: 'Load-Capacity Problem',
  compression: 'Compression Problem',
  instability: 'Instability Problem',
  coordination_control: 'Coordination/Control Problem',
  sensitivity_dominant: 'Sensitivity-Dominant Problem',
  mixed: 'Mixed Problem',
};

const MECHANISM_LABELS: Record<DominantMechanism, string> = {
  compression: 'Compression Dominant',
  tensile_load: 'Tensile Load Dominant',
  instability: 'Instability Dominant',
  stiffness: 'Stiffness Dominant',
  motor_control: 'Motor Control Dominant',
  sensitisation: 'Sensitisation Dominant',
  unknown: 'Mechanism Unclear',
};

function determineMechanism(text: string, topFingerprint: ClinicalFingerprint | null): { mechanism: DominantMechanism; label: string; reasoning: string } {
  if (topFingerprint) {
    return {
      mechanism: topFingerprint.typicalMechanism,
      label: MECHANISM_LABELS[topFingerprint.typicalMechanism],
      reasoning: `Based on ${topFingerprint.condition} fingerprint match`,
    };
  }
  if (text.includes('compress') || text.includes('weight bearing') || text.includes('extension pain')) {
    return { mechanism: 'compression', label: 'Compression Dominant', reasoning: 'Compressive loading features identified' };
  }
  if (text.includes('stretch') || text.includes('tendon') || text.includes('tensile') || text.includes('loading')) {
    return { mechanism: 'tensile_load', label: 'Tensile Load Dominant', reasoning: 'Tensile loading features identified' };
  }
  if (text.includes('unstable') || text.includes('giving way') || text.includes('laxity')) {
    return { mechanism: 'instability', label: 'Instability Dominant', reasoning: 'Instability features identified' };
  }
  if (text.includes('stiff') || text.includes('restricted') || text.includes('tight')) {
    return { mechanism: 'stiffness', label: 'Stiffness Dominant', reasoning: 'Stiffness/restriction features identified' };
  }
  if (text.includes('control') || text.includes('coordination') || text.includes('timing')) {
    return { mechanism: 'motor_control', label: 'Motor Control Dominant', reasoning: 'Motor control deficiency features identified' };
  }
  if (text.includes('sensiti') || text.includes('central') || text.includes('widespread')) {
    return { mechanism: 'sensitisation', label: 'Sensitisation Dominant', reasoning: 'Central sensitisation features identified' };
  }
  return { mechanism: 'unknown', label: 'Mechanism Unclear', reasoning: 'Insufficient data to determine dominant mechanism' };
}

function planMissingData(input: ClinicalReasoningInput, irritability: IrritabilityAssessment, mustNotMiss: MustNotMissCondition[]): MissingDataItem[] {
  const items: MissingDataItem[] = [];
  const text = buildSearchText(input);

  const urgentMNM = mustNotMiss.filter(m => m.likelihood === 'unclear' || m.likelihood === 'moderate' || m.likelihood === 'possible');
  if (urgentMNM.length > 0) {
    const top = urgentMNM[0];
    items.push({
      question: top.screeningNeeded[0] || `Screen for ${top.condition}`,
      purpose: `Rule out ${top.condition} (currently ${top.likelihood} likelihood)`,
      priority: 100,
      category: 'screening',
    });
  }

  if (!input.aggravatingFactors || input.aggravatingFactors.length === 0) {
    items.push({ question: 'What specific movements or positions make your symptoms worse?', purpose: 'Identify aggravating factors for mechanism classification', priority: 85, category: 'subjective' });
  }
  if (!input.easingFactors || input.easingFactors.length === 0) {
    items.push({ question: 'What helps reduce or relieve your symptoms?', purpose: 'Identify easing factors for directional preference and staging', priority: 80, category: 'subjective' });
  }
  if (input.nightPain === undefined) {
    items.push({ question: 'Do you have pain at night that wakes you from sleep?', purpose: 'Assess irritability and screen for serious pathology', priority: 90, category: 'subjective' });
  }
  if (!input.duration) {
    items.push({ question: 'How long have you had these symptoms?', purpose: 'Determine condition staging and chronicity', priority: 75, category: 'history' });
  }
  if (!input.onset) {
    items.push({ question: 'How did your symptoms start? Was there a specific event?', purpose: 'Identify mechanism of injury for hypothesis generation', priority: 78, category: 'history' });
  }
  if (!text.includes('cough') && !text.includes('sneeze') && !text.includes('strain') && text.includes('back')) {
    items.push({ question: 'Does coughing or sneezing affect your symptoms?', purpose: 'Assess for intrathecal pressure increase — disc/neural involvement', priority: 70, category: 'objective' });
  }
  if (!text.includes('repeated') && !text.includes('centraliz') && !text.includes('peripheraliz') && (text.includes('back') || text.includes('neck'))) {
    items.push({ question: 'What is the response to repeated movements (flexion/extension)?', purpose: 'Determine directional preference and classify mechanical pattern', priority: 72, category: 'objective' });
  }
  if (!text.includes('neuro') && !text.includes('sensation') && !text.includes('reflex') && (text.includes('arm') || text.includes('leg') || text.includes('radicu') || text.includes('numb'))) {
    items.push({ question: 'Neurological screening needed: dermatomes, myotomes, reflexes', purpose: 'Determine neural involvement and level', priority: 88, category: 'screening' });
  }
  if (input.previousEpisodes === undefined) {
    items.push({ question: 'Have you had similar symptoms before?', purpose: 'Assess for recurrent pattern and chronicity risk', priority: 65, category: 'history' });
  }

  return items.sort((a, b) => b.priority - a.priority);
}

export async function analyzeClinicalReasoning(input: ClinicalReasoningInput): Promise<ClinicalReasoningResult> {
  const text = buildSearchText(input);
  const fingerprintMatches = matchFingerprints(input);
  const topFp = fingerprintMatches.length > 0 ? fingerprintMatches[0].fingerprint : null;

  const irritability = assessIrritability(input);
  const stage = determineStage(input, topFp);
  const modifiers = detectModifiers(input);
  const mustNotMiss = detectMustNotMiss(input);
  const problemClass = determineProblemClass(text, topFp);
  const dominantMechanism = determineMechanism(text, topFp);

  let hypotheses: ReasoningHypothesis[] = [];
  let dominantSymptomDriver = { driver: 'Unknown', mechanism: 'Insufficient data', reasoning: '' };
  let reasoningLayers = {
    presentation: '',
    symptomPattern: '',
    mechanismPattern: '',
    tissueFamilySuspicion: '',
    differentialSummary: '',
  };

  try {
    const aiResult = await generateAIHypotheses(input, fingerprintMatches, irritability, stage, problemClass, dominantMechanism);
    hypotheses = aiResult.hypotheses;
    dominantSymptomDriver = aiResult.dominantSymptomDriver;
    reasoningLayers = aiResult.reasoningLayers;
  } catch (err) {
    console.error('AI hypothesis generation failed, using fingerprint fallback:', err);
    hypotheses = fingerprintMatches.slice(0, 5).map((fm, i) => ({
      id: `fp_${i}`,
      condition: fm.fingerprint.condition,
      confidence: Math.round(Math.min(95, (fm.score / Math.max(fm.maxPossible, 1)) * 100)),
      supporting: fm.matched.map(m => ({ feature: m.feature, weight: m.weight })),
      contradicting: fm.contradicted.map(m => ({ feature: m.feature, weight: Math.abs(m.weight) })),
      fingerprintMatchScore: Math.round((fm.score / Math.max(fm.maxPossible, 1)) * 100),
      structuralHypothesis: fm.fingerprint.condition,
      dominantClinicalDriver: `${PROBLEM_CLASS_LABELS[fm.fingerprint.typicalProblemClass]} — ${MECHANISM_LABELS[fm.fingerprint.typicalMechanism]}`,
    }));
    if (hypotheses.length > 0) {
      dominantSymptomDriver = {
        driver: hypotheses[0].dominantClinicalDriver,
        mechanism: MECHANISM_LABELS[fingerprintMatches[0].fingerprint.typicalMechanism],
        reasoning: 'Derived from fingerprint pattern matching (AI unavailable)',
      };
    }
  }

  const missingData = planMissingData(input, irritability, mustNotMiss);

  return {
    hypotheses,
    dominantSymptomDriver,
    irritability,
    stage,
    problemClass,
    dominantMechanism,
    modifiers,
    mustNotMiss,
    missingData,
    reasoningLayers,
    timestamp: new Date().toISOString(),
  };
}

async function generateAIHypotheses(
  input: ClinicalReasoningInput,
  fingerprintMatches: Array<{ fingerprint: ClinicalFingerprint; score: number; maxPossible: number; matched: WeightedEvidence[]; contradicted: WeightedEvidence[] }>,
  irritability: IrritabilityAssessment,
  stage: ConditionStage,
  problemClass: { primary: ProblemClass; label: string },
  dominantMechanism: { mechanism: DominantMechanism; label: string; reasoning: string },
): Promise<{
  hypotheses: ReasoningHypothesis[];
  dominantSymptomDriver: { driver: string; mechanism: string; reasoning: string };
  reasoningLayers: { presentation: string; symptomPattern: string; mechanismPattern: string; tissueFamilySuspicion: string; differentialSummary: string };
}> {
  const fingerprintContext = fingerprintMatches.slice(0, 5).map(fm =>
    `- ${fm.fingerprint.condition}: score ${fm.score.toFixed(1)}/${fm.maxPossible.toFixed(1)} (${Math.round((fm.score / Math.max(fm.maxPossible, 1)) * 100)}%), matched: [${fm.matched.map(m => m.feature).join(', ')}], contradicted: [${fm.contradicted.map(m => m.feature).join(', ')}]`
  ).join('\n');

  const postureContext = input.postureState
    ? Object.entries(input.postureState)
        .flatMap(([g, vals]) => Object.entries(vals).filter(([, v]) => Math.abs(v) > 3).map(([p, v]) => `${g}.${p}: ${v}`))
        .join(', ')
    : 'None';

  const painContext = input.painMarkers?.map(p => `${p.region} (severity: ${p.severity ?? '?'}, type: ${p.type ?? '?'}, mechanism: ${p.mechanism ?? '?'})`).join('; ') || 'None';

  const prompt = `You are an expert musculoskeletal physiotherapy clinical reasoning engine. Analyze the following case using LAYERED reasoning.

CLINICAL INPUT:
Subjective history: ${input.subjectiveHistory || 'Not provided'}
Symptoms: ${input.symptoms?.join(', ') || 'From history'}
Aggravating factors: ${input.aggravatingFactors?.join(', ') || 'Not specified'}
Easing factors: ${input.easingFactors?.join(', ') || 'Not specified'}
Onset: ${input.onset || 'Not specified'}
Duration: ${input.duration || 'Not specified'}
Night pain: ${input.nightPain !== undefined ? (input.nightPain ? 'Yes' : 'No') : 'Not assessed'}
Resting pain: ${input.restingPain !== undefined ? (input.restingPain ? 'Yes' : 'No') : 'Not assessed'}
Previous episodes: ${input.previousEpisodes !== undefined ? (input.previousEpisodes ? 'Yes' : 'No') : 'Not assessed'}
Pain markers: ${painContext}
Posture deviations: ${postureContext}

PRE-COMPUTED CONTEXT:
Irritability: ${irritability.level} (score: ${irritability.score})
Stage: ${stage.label} — ${stage.reasoning}
Problem class: ${problemClass.label}
Dominant mechanism: ${dominantMechanism.label}

FINGERPRINT MATCHES (weighted pattern scoring):
${fingerprintContext || 'No significant fingerprint matches'}

INSTRUCTIONS:
1. Reason in layers: presentation → symptom pattern → mechanism pattern → tissue family suspicion → differential hypotheses → ranking → dominant driver
2. For each hypothesis: provide supporting AND contradicting features with weighted importance
3. Separate STRUCTURAL HYPOTHESIS (what condition is likely) from DOMINANT CLINICAL DRIVER (what is causing symptoms now)
4. Generate 3-6 hypotheses ranked by confidence (0-100)

Return ONLY valid JSON with this exact structure:
{
  "reasoningLayers": {
    "presentation": "1-2 sentence summary of the clinical presentation",
    "symptomPattern": "Classify the symptom pattern (e.g., flexion-provoked mechanical, progressive stiffness, load-related)",
    "mechanismPattern": "Identify the dominant mechanism (e.g., compressive/mechanical, tensile overload, capsular restriction)",
    "tissueFamilySuspicion": "Which tissue families are implicated (e.g., disc/facet/muscle, capsular/periarticular, tendon/muscle-tendon junction)",
    "differentialSummary": "1-2 sentence summary of differential reasoning"
  },
  "hypotheses": [
    {
      "condition": "Specific condition name",
      "confidence": 74,
      "structuralHypothesis": "The structural/pathological diagnosis",
      "dominantClinicalDriver": "What is causing symptoms RIGHT NOW (may differ from structural diagnosis)",
      "supporting": [
        { "feature": "Specific feature from the case", "weight": 3 }
      ],
      "contradicting": [
        { "feature": "Feature that argues against", "weight": 2 }
      ]
    }
  ],
  "dominantSymptomDriver": {
    "driver": "The single most important current symptom driver",
    "mechanism": "The mechanism by which it drives symptoms",
    "reasoning": "Why this is the dominant driver right now"
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a clinical reasoning engine for physiotherapy. You reason in layers and separate structural diagnoses from dominant symptom drivers. Always return valid JSON only.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 3000,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  const hypotheses: ReasoningHypothesis[] = (result.hypotheses || []).map((h: Record<string, unknown>, i: number) => {
    const fpMatch = fingerprintMatches.find(fm =>
      fm.fingerprint.condition.toLowerCase().includes((h.condition as string || '').toLowerCase().split(' ')[0]) ||
      (h.condition as string || '').toLowerCase().includes(fm.fingerprint.condition.toLowerCase().split(' ')[0])
    );
    const fpScore = fpMatch ? Math.round((fpMatch.score / Math.max(fpMatch.maxPossible, 1)) * 100) : 0;

    return {
      id: `hyp_${i}`,
      condition: (h.condition as string) || 'Unknown',
      confidence: Math.min(95, Math.max(5, (h.confidence as number) || 50)),
      supporting: ((h.supporting as Array<Record<string, unknown>>) || []).map((s) => ({
        feature: (s.feature as string) || '',
        weight: (s.weight as number) || 1,
      })),
      contradicting: ((h.contradicting as Array<Record<string, unknown>>) || []).map((c) => ({
        feature: (c.feature as string) || '',
        weight: (c.weight as number) || 1,
      })),
      fingerprintMatchScore: fpScore,
      structuralHypothesis: (h.structuralHypothesis as string) || (h.condition as string) || '',
      dominantClinicalDriver: (h.dominantClinicalDriver as string) || '',
    };
  });

  hypotheses.sort((a, b) => {
    const weightedA = a.confidence * 0.6 + a.fingerprintMatchScore * 0.4;
    const weightedB = b.confidence * 0.6 + b.fingerprintMatchScore * 0.4;
    return weightedB - weightedA;
  });

  const dsd = result.dominantSymptomDriver || {};
  const rl = result.reasoningLayers || {};

  return {
    hypotheses,
    dominantSymptomDriver: {
      driver: (dsd.driver as string) || hypotheses[0]?.dominantClinicalDriver || 'Unknown',
      mechanism: (dsd.mechanism as string) || dominantMechanism.label,
      reasoning: (dsd.reasoning as string) || '',
    },
    reasoningLayers: {
      presentation: (rl.presentation as string) || '',
      symptomPattern: (rl.symptomPattern as string) || '',
      mechanismPattern: (rl.mechanismPattern as string) || '',
      tissueFamilySuspicion: (rl.tissueFamilySuspicion as string) || '',
      differentialSummary: (rl.differentialSummary as string) || '',
    },
  };
}
