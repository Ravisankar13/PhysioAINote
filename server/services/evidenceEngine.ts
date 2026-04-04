import type {
  ClinicalReasoningResult,
  IrritabilityLevel,
  ConditionStageType,
  ProblemClass,
  DominantMechanism,
} from './clinicalReasoningEngine';

import { SHARED_TECHNIQUE_DB, type TechniqueEvidence, type EvidenceReference, type ClinicalStatusKey } from '@shared/evidenceReferences';
import { EXERCISE_CATALOG, type CatalogExercise } from '@shared/exerciseCatalog';
import { allResearchPapers } from '../comprehensiveResearchDatabase';

import { bissetConditionApproaches, bissetResearchArticles } from '../bisset-elbow-library';
import { grimaldiConditionApproaches, grimaldiResearchArticles } from '../grimaldi-hip-library';
import { joGibsonConditionApproaches, joGibsonResearchArticles } from '../joGibsonShoulderLibrary';
import { clinicalEdgeConditionApproaches, clinicalEdgeResearchArticles } from '../clinicalEdgeLibrary';
import { physioNetworkConditionApproaches, physioNetworkResearchArticles } from '../physioNetworkLibrary';
import { sportsMapConditionApproaches, sportsMapResearchArticles } from '../sportsMapLibrary';

export type EvidenceGradeLevel = 'A' | 'B' | 'C' | 'Expert';

export type EvidenceCategory =
  | 'manual_therapy'
  | 'exercise'
  | 'modality'
  | 'education'
  | 'load_management'
  | 'neural'
  | 'pharmacological_referral';

export interface BiomechanicsInput {
  faults?: Array<{ label: string; severity: string; category: string }>;
  jointIssues?: Array<{ joint: string; issue: string; severity: string }>;
  qualityScore?: number;
  movementTask?: string;
}

export interface SlingInput {
  weakLinks?: string[];
  systemFailures?: string[];
  forceTransferScore?: number;
  dominantDysfunction?: string;
}

export interface PatientContextInput {
  goals?: string[];
  sport?: string;
  equipment?: string[];
  adherenceLevel?: 'low' | 'moderate' | 'high';
  workDemands?: string;
  activityLevel?: string;
  age?: number;
  gender?: string;
}

export interface EvidenceQueryInput {
  diagnosis?: string;
  bodyRegions?: string[];
  stage?: ConditionStageType;
  irritability?: IrritabilityLevel;
  mechanism?: DominantMechanism;
  problemClass?: ProblemClass;
  tissueType?: string;
  tissuePathology?: string;
  loadTolerance?: 'low' | 'moderate' | 'high';
  biomechanics?: BiomechanicsInput;
  sling?: SlingInput;
  patientContext?: PatientContextInput;
  structuredReasoning?: ClinicalReasoningResult;
  maxResults?: number;
}

export interface LiteratureReference {
  authors: string;
  year: number;
  title: string;
  journal: string;
  pmid?: string;
}

export interface EvidenceOption {
  id: string;
  name: string;
  category: EvidenceCategory;
  evidenceGrade: EvidenceGradeLevel;
  relevanceScore: number;
  description: string;
  dosage: string;
  rationale: string;
  mechanismOfAction: string;
  targetRegions: string[];
  stageAppropriateness: boolean;
  loadCompatibility: boolean;
  riskFlags: string[];
  contraindications: string[];
  tissueMatch: boolean;
  references: LiteratureReference[];
  sourceLibrary: string;
  expertApproach?: string;
  problemClassMatch: ProblemClass[];
  mechanismMatch: DominantMechanism[];
  linkedTechniqueDbKeys?: string[];
  expectedTimeframe?: string;
  irritabilityMax: IrritabilityLevel;
}

export interface EvidenceQueryResult {
  options: EvidenceOption[];
  queryContext: {
    diagnosis: string;
    regions: string[];
    stage: string;
    irritability: string;
    mechanism: string;
    problemClass: string;
  };
  gradeDistribution: Record<EvidenceGradeLevel, number>;
  categoryDistribution: Record<string, number>;
  timestamp: string;
}

type LoadLevel = 'low' | 'moderate' | 'high';

interface CatalogEntry {
  id: string;
  name: string;
  category: EvidenceCategory;
  description: string;
  dosage: string;
  rationale: string;
  mechanismOfAction: string;
  evidenceGrade: EvidenceGradeLevel;
  targetRegions: string[];
  contraindications: string[];
  stageRestrictions: ConditionStageType[];
  irritabilityMax: IrritabilityLevel;
  loadDemand: LoadLevel;
  problemClassMatch: ProblemClass[];
  mechanismMatch: DominantMechanism[];
  references: LiteratureReference[];
  sourceLibrary: string;
  conditionKeywords: string[];
  expertApproach?: string;
  linkedTechniqueDbKeys?: string[];
  expectedTimeframe?: string;
}

function assignLoadDemand(entry: Omit<CatalogEntry, 'loadDemand'>): CatalogEntry {
  const id = entry.id;
  const cat = entry.category;

  const lowLoadIds = ['joint_mob_grade_1_2', 'pain_neuroscience_education', 'activity_modification', 'taping_support', 'isometric_loading'];
  const highLoadIds = ['joint_mob_grade_3_4', 'eccentric_programme', 'progressive_strengthening', 'graded_exposure', 'thoracic_manipulation'];

  if (lowLoadIds.includes(id)) return { ...entry, loadDemand: 'low' };
  if (highLoadIds.includes(id)) return { ...entry, loadDemand: 'high' };

  if (cat === 'education') return { ...entry, loadDemand: 'low' };
  if (cat === 'manual_therapy') return { ...entry, loadDemand: 'low' };
  if (cat === 'neural') return { ...entry, loadDemand: 'low' };
  if (cat === 'load_management') return { ...entry, loadDemand: 'moderate' };

  if (entry.stageRestrictions.includes('acute')) return { ...entry, loadDemand: 'high' };

  const descLower = entry.description.toLowerCase();
  if (descLower.includes('heavy') || descLower.includes('plyometric') || descLower.includes('high-intensity') || descLower.includes('end-range')) {
    return { ...entry, loadDemand: 'high' };
  }
  if (descLower.includes('gentle') || descLower.includes('isometric') || descLower.includes('passive') || descLower.includes('pain-free')) {
    return { ...entry, loadDemand: 'low' };
  }

  return { ...entry, loadDemand: 'moderate' };
}

const UNIFIED_CATALOG: CatalogEntry[] = buildUnifiedCatalog();

function buildUnifiedCatalog(): CatalogEntry[] {
  const raw: Omit<CatalogEntry, 'loadDemand'>[][] = [
    buildCoreInterventions(),
    buildTechniqueDbEntries(),
    buildExpertLibraryEntries(),
    buildExerciseCatalogEntries(),
    buildResearchDatabaseEntries(),
  ];

  return raw.flat().map(assignLoadDemand);
}

type CatalogEntryWithoutLoad = Omit<CatalogEntry, 'loadDemand'>;

function buildCoreInterventions(): CatalogEntryWithoutLoad[] {
  return [
    {
      id: 'joint_mob_grade_1_2',
      name: 'Joint Mobilisation (Grade I-II)',
      category: 'manual_therapy',
      description: 'Oscillatory accessory movements within pain-free range for pain modulation and neurophysiological inhibition',
      dosage: '3-5 sets of 30-60s oscillations per segment',
      rationale: 'Grade I-II mobilisations activate descending pain inhibition via large-diameter afferent input (gate control) and reduce sympathetic tone',
      mechanismOfAction: 'Gate control theory activation through large-diameter afferent stimulation; descending inhibition via periaqueductal grey',
      evidenceGrade: 'A',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
      contraindications: ['fracture', 'malignancy', 'active infection', 'vascular compromise'],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['mobility_restriction', 'compression', 'sensitivity_dominant'],
      mechanismMatch: ['compression', 'stiffness', 'sensitisation'],
      references: [
        { authors: 'Bialosky JE et al.', year: 2009, title: 'The mechanisms of manual therapy in the treatment of musculoskeletal pain', journal: 'Man Ther', pmid: '18789756' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['stiffness', 'joint pain', 'restricted movement'],
      expectedTimeframe: 'Immediate pain relief; 2-4 sessions for sustained effect',
    },
    {
      id: 'joint_mob_grade_3_4',
      name: 'Joint Mobilisation (Grade III-IV)',
      category: 'manual_therapy',
      description: 'Large-amplitude accessory movements at end range to restore joint mobility and break adhesion barriers',
      dosage: '3-5 sets of 30s at end-range, reassess ROM between sets',
      rationale: 'End-range mobilisation produces mechanical hysteresis and neurophysiological effects restoring accessory glide',
      mechanismOfAction: 'Mechanical hysteresis in capsular tissue; neurophysiological inhibition of protective muscle guarding',
      evidenceGrade: 'A',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
      contraindications: ['fracture', 'malignancy', 'acute inflammation', 'hypermobility', 'osteoporosis'],
      stageRestrictions: ['acute'],
      irritabilityMax: 'moderate',
      problemClassMatch: ['mobility_restriction', 'compression'],
      mechanismMatch: ['stiffness', 'compression'],
      references: [
        { authors: 'Maitland GD et al.', year: 2005, title: 'Maitland\'s Vertebral Manipulation', journal: 'Elsevier' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['stiffness', 'restricted ROM', 'capsular restriction'],
      expectedTimeframe: '2-6 weeks for ROM restoration',
    },
    {
      id: 'soft_tissue_release',
      name: 'Soft Tissue Release / Myofascial Release',
      category: 'manual_therapy',
      description: 'Sustained pressure and longitudinal gliding to reduce fascial restrictions and muscle tone',
      dosage: '3-5 min per area, moderate to deep pressure',
      rationale: 'Thixotropic reduction in fascial viscosity and autogenic inhibition via Golgi tendon organ activation',
      mechanismOfAction: 'Thixotropy-mediated viscosity reduction; piezoelectric effect on collagen; Golgi tendon organ mediated inhibition',
      evidenceGrade: 'B',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee'],
      contraindications: ['open wounds', 'DVT', 'acute inflammation'],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['mobility_restriction', 'load_capacity', 'compression', 'mixed'],
      mechanismMatch: ['stiffness', 'compression', 'tensile_load'],
      references: [
        { authors: 'Ajimsha MS et al.', year: 2015, title: 'Effectiveness of myofascial release: systematic review of randomized controlled trials', journal: 'J Bodyw Mov Ther', pmid: '25603749' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['tightness', 'fascial restriction', 'muscle tension'],
      linkedTechniqueDbKeys: ['shortened'],
      expectedTimeframe: 'Immediate tone reduction; 3-6 sessions for lasting change',
    },
    {
      id: 'trigger_point_therapy',
      name: 'Trigger Point Pressure Release',
      category: 'manual_therapy',
      description: 'Sustained ischemic compression to deactivate myofascial trigger points and reduce referred pain patterns',
      dosage: '60-90s sustained pressure per point, 3-5 points per session',
      rationale: 'Motor end plate dysfunction reset via ischemic compression and local vasodilation',
      mechanismOfAction: 'Ischemic compression disrupts dysfunctional motor endplate activity; reactive hyperaemia flushes nociceptive mediators',
      evidenceGrade: 'B',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee'],
      contraindications: ['anticoagulant therapy', 'local infection'],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['load_capacity', 'sensitivity_dominant', 'mixed'],
      mechanismMatch: ['tensile_load', 'sensitisation'],
      references: [
        { authors: 'Fernández-de-las-Peñas C, Dommerholt J', year: 2018, title: 'International consensus on diagnostic criteria and clinical considerations of MPS', journal: 'Curr Pain Headache Rep', pmid: '29340806' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['trigger point', 'referred pain', 'myofascial pain'],
      linkedTechniqueDbKeys: ['overactive'],
      expectedTimeframe: '1-3 sessions for acute trigger points; 4-8 for chronic',
    },
    {
      id: 'neural_mobilisation',
      name: 'Neural Mobilisation / Neurodynamics',
      category: 'neural',
      description: 'Slider and tensioner techniques to restore neural tissue mobility and reduce mechanosensitivity',
      dosage: '3 sets of 10-15 gentle oscillations, pain-free range',
      rationale: 'Restores intraneural blood flow and reduces neural mechanosensitivity via axoplasmic flow enhancement',
      mechanismOfAction: 'Restoration of intraneural microcirculation; reduction of neural oedema; desensitisation of nervi nervorum',
      evidenceGrade: 'A',
      targetRegions: ['cervical', 'lumbar', 'shoulder', 'hip'],
      contraindications: ['active radiculopathy with progressive deficit', 'cauda equina', 'spinal cord compression'],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['compression', 'sensitivity_dominant'],
      mechanismMatch: ['compression', 'sensitisation'],
      references: [
        { authors: 'Basson A et al.', year: 2017, title: 'The effectiveness of neural mobilization for neuromusculoskeletal conditions', journal: 'J Orthop Sports Phys Ther', pmid: '28622488' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['nerve', 'neural', 'radiculopathy', 'numbness', 'tingling'],
      expectedTimeframe: '2-6 weeks for neural desensitisation',
    },
    {
      id: 'isometric_loading',
      name: 'Isometric Loading Programme',
      category: 'exercise',
      description: 'Sustained isometric contractions for tendon pain modulation and early-stage load introduction',
      dosage: '5 reps × 45s holds at 70% MVC, 3×/day',
      rationale: 'Isometric loading produces cortical inhibition of pain and stimulates tendon matrix remodelling without compressive load',
      mechanismOfAction: 'Cortical pain inhibition via sustained motor cortex activation; mechanotransduction stimulates tenocyte collagen synthesis',
      evidenceGrade: 'A',
      targetRegions: ['shoulder', 'knee', 'ankle', 'hip', 'elbow'],
      contraindications: ['acute fracture', 'complete tendon rupture'],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['load_capacity'],
      mechanismMatch: ['tensile_load'],
      references: [
        { authors: 'Rio E et al.', year: 2015, title: 'Isometric exercise induces analgesia and reduces inhibition in patellar tendinopathy', journal: 'Br J Sports Med', pmid: '25979840' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['tendinopathy', 'tendon pain', 'load capacity'],
      linkedTechniqueDbKeys: ['inhibited'],
      expectedTimeframe: 'Immediate analgesic effect (45 min); 2-4 weeks for structural adaptation',
    },
    {
      id: 'eccentric_programme',
      name: 'Eccentric Loading Programme',
      category: 'exercise',
      description: 'Progressive eccentric strengthening for tendon remodelling and muscle length-tension restoration',
      dosage: '3 × 15 reps, slow 4s eccentric phase, daily',
      rationale: 'Promotes sarcomere addition in series and collagen realignment via mechanotransduction',
      mechanismOfAction: 'Mechanotransduction drives collagen type I synthesis; sarcomere addition in series restores optimal length-tension',
      evidenceGrade: 'A',
      targetRegions: ['shoulder', 'knee', 'ankle', 'hip', 'elbow'],
      contraindications: ['reactive tendinopathy', 'acute inflammation'],
      stageRestrictions: ['acute', 'reactive'],
      irritabilityMax: 'moderate',
      problemClassMatch: ['load_capacity'],
      mechanismMatch: ['tensile_load'],
      references: [
        { authors: 'Alfredson H et al.', year: 1998, title: 'Heavy-load eccentric calf muscle training for the treatment of chronic Achilles tendinosis', journal: 'Am J Sports Med', pmid: '9617396' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['tendinopathy', 'tendon remodelling', 'eccentric'],
      linkedTechniqueDbKeys: ['shortened'],
      expectedTimeframe: '6-12 weeks for tendon remodelling',
    },
    {
      id: 'progressive_strengthening',
      name: 'Progressive Resistance Training',
      category: 'exercise',
      description: 'Graded resistance programme targeting identified weak or inhibited muscle groups',
      dosage: '3 × 8-12 reps, RPE 6-8, 3×/week with progressive overload',
      rationale: 'Addresses load capacity deficits through neural adaptation (weeks 1-6) and hypertrophy (weeks 6+)',
      mechanismOfAction: 'Neural adaptation increases motor unit recruitment; type II fibre hypertrophy increases force production capacity',
      evidenceGrade: 'A',
      targetRegions: ['shoulder', 'hip', 'knee', 'ankle', 'lumbar', 'cervical'],
      contraindications: ['unstable fracture', 'acute inflammatory arthropathy'],
      stageRestrictions: ['acute'],
      irritabilityMax: 'moderate',
      problemClassMatch: ['load_capacity', 'instability', 'coordination_control'],
      mechanismMatch: ['tensile_load', 'instability', 'motor_control'],
      references: [
        { authors: 'Kristensen J, Franklyn-Miller A', year: 2012, title: 'Resistance training in musculoskeletal rehabilitation', journal: 'Br J Sports Med', pmid: '21572102' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['weakness', 'deconditioning', 'strength deficit'],
      linkedTechniqueDbKeys: ['weak'],
      expectedTimeframe: '6-12 weeks for strength gains; 12+ weeks for hypertrophy',
    },
    {
      id: 'motor_control_retraining',
      name: 'Motor Control Retraining',
      category: 'exercise',
      description: 'Specific re-education of deep stabiliser activation and movement pattern correction',
      dosage: '3 × 10 reps with biofeedback, low load, daily',
      rationale: 'Restores feedforward timing of deep stabilisers disrupted by pain inhibition',
      mechanismOfAction: 'Cortical reorganisation of motor maps; restoration of feedforward timing in deep stabiliser muscles',
      evidenceGrade: 'A',
      targetRegions: ['lumbar', 'cervical', 'shoulder', 'hip', 'knee'],
      contraindications: [],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['instability', 'coordination_control'],
      mechanismMatch: ['instability', 'motor_control'],
      references: [
        { authors: 'Hodges PW, Richardson CA', year: 1996, title: 'Inefficient muscular stabilization of the lumbar spine associated with low back pain', journal: 'Spine', pmid: '8961451' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['instability', 'motor control', 'coordination', 'stabilisation'],
      linkedTechniqueDbKeys: ['inhibited'],
      expectedTimeframe: '4-8 weeks for motor pattern correction',
    },
    {
      id: 'graded_exposure',
      name: 'Graded Exposure to Movement',
      category: 'exercise',
      description: 'Systematic desensitisation to feared movements using a hierarchy of progressive exposure',
      dosage: 'Fear hierarchy: 3-5 exposure levels, progress when distress < 3/10',
      rationale: 'Reduces fear-avoidance beliefs and central sensitisation through extinction learning',
      mechanismOfAction: 'Extinction learning in amygdala; prefrontal cortex mediated reappraisal of movement threat value',
      evidenceGrade: 'A',
      targetRegions: ['lumbar', 'cervical', 'thoracic'],
      contraindications: ['structural instability', 'active pathology requiring rest'],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['sensitivity_dominant', 'mixed'],
      mechanismMatch: ['sensitisation', 'motor_control'],
      references: [
        { authors: 'López-de-Uralde-Villanueva I et al.', year: 2016, title: 'A systematic review of the effectiveness of graded activity and graded exposure for chronic nonspecific low back pain', journal: 'Pain Med', pmid: '26814283' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['fear avoidance', 'kinesiophobia', 'chronic pain', 'sensitisation'],
      expectedTimeframe: '4-12 weeks for behavioural change',
    },
    {
      id: 'pain_neuroscience_education',
      name: 'Pain Neuroscience Education (PNE)',
      category: 'education',
      description: 'Reconceptualisation of pain as a protective output, addressing threat appraisal and central sensitisation',
      dosage: '1-2 structured sessions + handout, reinforce each visit',
      rationale: 'Reduces pain catastrophising and threat perception by targeting cortical representation of danger',
      mechanismOfAction: 'Cognitive reappraisal reduces prefrontal-amygdala threat signalling; lowers cortisol and sympathetic tone',
      evidenceGrade: 'A',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee'],
      contraindications: [],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['sensitivity_dominant', 'mixed'],
      mechanismMatch: ['sensitisation'],
      references: [
        { authors: 'Louw A et al.', year: 2016, title: 'The efficacy of pain neuroscience education on musculoskeletal pain', journal: 'Physiother Theory Pract', pmid: '27351541' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['chronic pain', 'central sensitisation', 'pain education'],
      expectedTimeframe: '2-4 weeks for cognitive shift; ongoing reinforcement',
    },
    {
      id: 'activity_modification',
      name: 'Activity & Load Management',
      category: 'load_management',
      description: 'Structured modification of aggravating activities with graded return-to-activity planning',
      dosage: 'Reduce provocative loads to 70% current capacity, progress 10%/week',
      rationale: 'Allows tissue healing while maintaining activity levels above deconditioning threshold',
      mechanismOfAction: 'Keeps tissue loading below injury threshold while maintaining above deconditioning threshold; progressive overload principle',
      evidenceGrade: 'B',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
      contraindications: [],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['load_capacity', 'compression', 'sensitivity_dominant', 'mixed'],
      mechanismMatch: ['tensile_load', 'compression', 'sensitisation'],
      references: [
        { authors: 'Gabbett TJ', year: 2016, title: 'The training—injury prevention paradox', journal: 'Br J Sports Med', pmid: '26758673' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['overload', 'load management', 'activity modification'],
      expectedTimeframe: 'Immediate symptom reduction; 4-8 weeks for graded return',
    },
    {
      id: 'stretching_programme',
      name: 'Targeted Stretching Programme',
      category: 'exercise',
      description: 'Static and PNF stretching for identified shortened muscles contributing to movement restriction',
      dosage: '3-4 × 30-60s holds per muscle, daily',
      rationale: 'Viscoelastic creep and sarcomere remodelling to restore optimal length-tension relationship',
      mechanismOfAction: 'Viscoelastic creep elongates connective tissue; neurological tolerance to stretch increases with repeated exposure',
      evidenceGrade: 'A',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
      contraindications: ['hypermobility in target region', 'acute muscle tear'],
      stageRestrictions: ['acute'],
      irritabilityMax: 'moderate',
      problemClassMatch: ['mobility_restriction'],
      mechanismMatch: ['stiffness'],
      references: [
        { authors: 'Page P', year: 2012, title: 'Current concepts in muscle stretching for exercise and rehabilitation', journal: 'Int J Sports Phys Ther', pmid: '22319684' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['shortening', 'tightness', 'flexibility'],
      linkedTechniqueDbKeys: ['shortened'],
      expectedTimeframe: '2-6 weeks for sustained flexibility gains',
    },
    {
      id: 'thoracic_manipulation',
      name: 'Thoracic Spine Manipulation (HVLA)',
      category: 'manual_therapy',
      description: 'High-velocity low-amplitude thrust to thoracic spine for rapid neurophysiological pain modulation',
      dosage: '1-2 thrusts per session, reassess immediately',
      rationale: 'Produces immediate hypoalgesic effect via descending inhibition and sympathoexcitatory response',
      mechanismOfAction: 'Rapid joint cavitation triggers sympathoexcitatory response; descending inhibition from PAG activation',
      evidenceGrade: 'A',
      targetRegions: ['thoracic', 'cervical', 'shoulder'],
      contraindications: ['osteoporosis', 'fracture', 'malignancy', 'vascular disease', 'anticoagulant therapy'],
      stageRestrictions: ['acute'],
      irritabilityMax: 'moderate',
      problemClassMatch: ['mobility_restriction', 'compression'],
      mechanismMatch: ['stiffness', 'compression'],
      references: [
        { authors: 'Cleland JA et al.', year: 2007, title: 'Immediate effects of thoracic manipulation in patients with neck pain', journal: 'Man Ther', pmid: '16934530' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['thoracic stiffness', 'neck pain', 'shoulder pain'],
      expectedTimeframe: 'Immediate session effect; 2-4 sessions for lasting change',
    },
    {
      id: 'taping_support',
      name: 'Therapeutic Taping (Kinesiology / Rigid)',
      category: 'modality',
      description: 'Supportive or facilitative taping for postural correction, proprioceptive cueing, or offloading',
      dosage: 'Applied each session, patient can maintain 2-3 days',
      rationale: 'Cutaneous proprioceptive input alters motor recruitment patterns and provides external postural cue',
      mechanismOfAction: 'Stimulates cutaneous mechanoreceptors altering proprioceptive input to motor cortex',
      evidenceGrade: 'C',
      targetRegions: ['shoulder', 'knee', 'ankle', 'lumbar', 'cervical'],
      contraindications: ['skin allergy to tape', 'open wounds'],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['instability', 'coordination_control', 'load_capacity'],
      mechanismMatch: ['instability', 'motor_control', 'tensile_load'],
      references: [],
      sourceLibrary: 'core',
      conditionKeywords: ['instability', 'postural correction', 'proprioception'],
      linkedTechniqueDbKeys: ['lengthened'],
      expectedTimeframe: 'Immediate proprioceptive effect; short-term adjunct',
    },
    {
      id: 'dry_needling',
      name: 'Dry Needling',
      category: 'manual_therapy',
      description: 'Filiform needle insertion into trigger points to elicit local twitch response and reset motor end plate',
      dosage: '2-3 insertions per trigger point, 4-6 points per session',
      rationale: 'Disrupts dysfunctional motor endplate and reduces spontaneous electrical activity at trigger point loci',
      mechanismOfAction: 'Local twitch response disrupts contracted sarcomeres; washout of nociceptive substances via reactive hyperaemia',
      evidenceGrade: 'A',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee'],
      contraindications: ['needle phobia', 'anticoagulant therapy', 'local infection', 'pregnancy (specific regions)'],
      stageRestrictions: ['acute'],
      irritabilityMax: 'moderate',
      problemClassMatch: ['load_capacity', 'sensitivity_dominant', 'mixed'],
      mechanismMatch: ['tensile_load', 'sensitisation'],
      references: [
        { authors: 'Gattie E et al.', year: 2017, title: 'The effectiveness of trigger point dry needling for musculoskeletal conditions by physical therapists', journal: 'J Orthop Sports Phys Ther', pmid: '28622490' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['trigger point', 'myofascial pain', 'muscle spasm'],
      linkedTechniqueDbKeys: ['overactive'],
      expectedTimeframe: '1-3 sessions for acute trigger points; 4-8 for chronic',
    },
    {
      id: 'ergonomic_advice',
      name: 'Ergonomic & Postural Advice',
      category: 'education',
      description: 'Workplace and activity-specific postural optimisation to reduce sustained tissue loading',
      dosage: 'Initial assessment + follow-up review, written action plan',
      rationale: 'Reduces cumulative tissue loading below injury threshold through environmental modification',
      mechanismOfAction: 'Redistributes sustained mechanical load across broader tissue area; reduces compression on sensitised structures',
      evidenceGrade: 'B',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip'],
      contraindications: [],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['compression'],
      mechanismMatch: ['compression'],
      references: [],
      sourceLibrary: 'core',
      conditionKeywords: ['posture', 'ergonomics', 'workplace'],
      expectedTimeframe: 'Immediate behavioural change; 2-4 weeks for habit formation',
    },
    {
      id: 'proprioceptive_training',
      name: 'Proprioceptive & Balance Training',
      category: 'exercise',
      description: 'Progressive balance and proprioceptive challenge for joint position sense restoration',
      dosage: '3 × 30-60s per exercise, progress surface instability weekly',
      rationale: 'Restores mechanoreceptor-mediated joint position sense disrupted by injury or deconditioning',
      mechanismOfAction: 'Repetitive proprioceptive challenge upregulates mechanoreceptor sensitivity and cortical somatosensory representation',
      evidenceGrade: 'A',
      targetRegions: ['ankle', 'knee', 'hip', 'lumbar'],
      contraindications: ['acute fracture', 'severe vestibular dysfunction'],
      stageRestrictions: ['acute'],
      irritabilityMax: 'moderate',
      problemClassMatch: ['instability', 'coordination_control'],
      mechanismMatch: ['instability', 'motor_control'],
      references: [
        { authors: 'Aman JE et al.', year: 2015, title: 'The effectiveness of proprioceptive training for improving motor function', journal: 'Front Hum Neurosci', pmid: '25674059' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['instability', 'balance', 'proprioception', 'ankle sprain'],
      expectedTimeframe: '4-8 weeks for proprioceptive restoration',
    },
    {
      id: 'hydrotherapy',
      name: 'Aquatic Therapy / Hydrotherapy',
      category: 'exercise',
      description: 'Water-based exercise programme utilising buoyancy for offloaded strengthening and ROM',
      dosage: '30-45 min sessions, 2-3×/week',
      rationale: 'Buoyancy reduces joint loading by 50-90% while hydrostatic pressure aids circulation and edema reduction',
      mechanismOfAction: 'Buoyancy reduces gravitational loading; hydrostatic pressure reduces oedema; warmth decreases muscle guarding',
      evidenceGrade: 'B',
      targetRegions: ['lumbar', 'hip', 'knee', 'ankle', 'shoulder'],
      contraindications: ['open wounds', 'uncontrolled cardiac conditions', 'urinary incontinence'],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['load_capacity', 'mobility_restriction', 'sensitivity_dominant'],
      mechanismMatch: ['compression', 'tensile_load', 'sensitisation'],
      references: [
        { authors: 'Barker AL et al.', year: 2014, title: 'Effectiveness of aquatic exercise for musculoskeletal conditions', journal: 'Arch Phys Med Rehabil', pmid: '24742939' },
      ],
      sourceLibrary: 'core',
      conditionKeywords: ['water therapy', 'offloaded exercise', 'joint pain'],
      expectedTimeframe: '4-8 weeks for functional improvement',
    },
    {
      id: 'refer_imaging',
      name: 'Refer for Imaging / Specialist Review',
      category: 'pharmacological_referral',
      description: 'Onward referral when red flags are present, diagnosis uncertain, or conservative management plateaus',
      dosage: 'Urgent (red flags) or routine (6-12 week plateau)',
      rationale: 'Clinical governance: imaging or specialist assessment when conservative management is insufficient or unsafe',
      mechanismOfAction: 'Specialist investigation to rule out serious pathology or confirm diagnosis for targeted intervention',
      evidenceGrade: 'Expert',
      targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
      contraindications: [],
      stageRestrictions: [],
      irritabilityMax: 'high',
      problemClassMatch: ['instability', 'sensitivity_dominant'],
      mechanismMatch: ['unknown'],
      references: [],
      sourceLibrary: 'core',
      conditionKeywords: ['red flags', 'imaging', 'referral', 'specialist'],
      expectedTimeframe: 'Urgent: within 24-48 hours; Routine: 2-6 weeks',
    },
  ];
}

function buildTechniqueDbEntries(): CatalogEntryWithoutLoad[] {
  const entries: CatalogEntryWithoutLoad[] = [];
  const statusToMechanism: Record<ClinicalStatusKey, DominantMechanism[]> = {
    shortened: ['stiffness'],
    overactive: ['tensile_load', 'sensitisation'],
    inhibited: ['motor_control', 'instability'],
    weak: ['tensile_load', 'instability'],
    spasm: ['sensitisation', 'compression'],
    lengthened: ['instability', 'motor_control'],
    normal: [],
  };
  const statusToProblemClass: Record<ClinicalStatusKey, ProblemClass[]> = {
    shortened: ['mobility_restriction'],
    overactive: ['load_capacity', 'sensitivity_dominant'],
    inhibited: ['coordination_control', 'instability'],
    weak: ['load_capacity'],
    spasm: ['sensitivity_dominant', 'mixed'],
    lengthened: ['instability'],
    normal: [],
  };

  for (const [statusKey, techniques] of Object.entries(SHARED_TECHNIQUE_DB)) {
    const key = statusKey as ClinicalStatusKey;
    if (key === 'normal' || techniques.length === 0) continue;

    for (const tech of techniques) {
      const category: EvidenceCategory = tech.type === 'manual' ? 'manual_therapy' : tech.type === 'modality' ? 'modality' : 'exercise';
      const id = `tech_${key}_${tech.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`;

      const existingIdx = entries.findIndex(e => e.name === tech.name && e.category === category);
      if (existingIdx >= 0) {
        const existing = entries[existingIdx];
        for (const m of statusToMechanism[key]) {
          if (!existing.mechanismMatch.includes(m)) existing.mechanismMatch.push(m);
        }
        for (const p of statusToProblemClass[key]) {
          if (!existing.problemClassMatch.includes(p)) existing.problemClassMatch.push(p);
        }
        continue;
      }

      entries.push({
        id,
        name: tech.name,
        category,
        description: tech.rationale,
        dosage: tech.dosage,
        rationale: tech.rationale,
        mechanismOfAction: tech.rationale,
        evidenceGrade: tech.evidenceGrade,
        targetRegions: ['cervical', 'thoracic', 'lumbar', 'shoulder', 'hip', 'knee', 'ankle'],
        contraindications: [],
        stageRestrictions: [],
        irritabilityMax: 'high',
        problemClassMatch: statusToProblemClass[key],
        mechanismMatch: statusToMechanism[key],
        references: tech.references.map(r => ({
          authors: r.authors,
          year: r.year,
          title: r.title,
          journal: r.journal,
          pmid: r.pmid,
        })),
        sourceLibrary: `technique_db (${key})`,
        conditionKeywords: [key, tech.name.toLowerCase()],
        expertApproach: tech.guidelineSource,
      });
    }
  }

  return entries;
}

interface ExpertCondition {
  condition: string;
  keyPrinciples: string[];
  evidence: string;
}

interface ExpertArticle {
  id: number;
  title: string;
  author: string;
  journal: string;
  year: number;
  bodyPart: string;
  abstract: string;
  keywords: string[];
}

function buildExpertLibraryEntries(): CatalogEntryWithoutLoad[] {
  const entries: CatalogEntryWithoutLoad[] = [];
  const libs: Array<{ name: string; conditions: ExpertCondition[]; articles: ExpertArticle[] }> = [
    { name: 'Bisset Elbow', conditions: bissetConditionApproaches, articles: bissetResearchArticles },
    { name: 'Grimaldi Hip', conditions: grimaldiConditionApproaches, articles: grimaldiResearchArticles },
    { name: 'Jo Gibson Shoulder', conditions: joGibsonConditionApproaches as ExpertCondition[], articles: joGibsonResearchArticles },
    { name: 'Clinical Edge', conditions: clinicalEdgeConditionApproaches, articles: clinicalEdgeResearchArticles },
    { name: 'Physio Network', conditions: physioNetworkConditionApproaches, articles: physioNetworkResearchArticles },
    { name: 'Sports Map', conditions: sportsMapConditionApproaches, articles: sportsMapResearchArticles },
  ];

  for (const lib of libs) {
    for (const cond of lib.conditions) {
      const bodyRegion = inferBodyRegion(cond.condition);
      const refs: LiteratureReference[] = lib.articles
        .filter(a => {
          const condWords = cond.condition.toLowerCase().split(/\s+/);
          return condWords.some(w => w.length > 3 && (a.title.toLowerCase().includes(w) || a.bodyPart === bodyRegion));
        })
        .slice(0, 3)
        .map(a => ({
          authors: a.author,
          year: a.year,
          title: a.title,
          journal: a.journal,
        }));

      const id = `expert_${lib.name.toLowerCase().replace(/\s+/g, '_')}_${cond.condition.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`;

      entries.push({
        id,
        name: `${cond.condition} — ${lib.name} Approach`,
        category: 'exercise',
        description: cond.keyPrinciples.join('; '),
        dosage: 'Per expert clinical protocol — individualised to patient presentation',
        rationale: cond.evidence,
        mechanismOfAction: cond.keyPrinciples[0] || cond.evidence,
        evidenceGrade: inferEvidenceGrade(cond.evidence),
        targetRegions: bodyRegion ? [bodyRegion] : ['general'],
        contraindications: [],
        stageRestrictions: [],
        irritabilityMax: 'high',
        problemClassMatch: ['load_capacity', 'mobility_restriction', 'coordination_control'],
        mechanismMatch: ['tensile_load', 'motor_control', 'stiffness'],
        references: refs,
        sourceLibrary: lib.name,
        conditionKeywords: cond.condition.toLowerCase().split(/\s+/).filter(w => w.length > 3),
        expertApproach: lib.name,
      });
    }
  }

  return entries;
}

function inferBodyRegion(conditionName: string): string {
  const lower = conditionName.toLowerCase();
  if (lower.includes('elbow') || lower.includes('epicondyl') || lower.includes('tennis') || lower.includes('golfer')) return 'elbow';
  if (lower.includes('shoulder') || lower.includes('rotator') || lower.includes('subacromial') || lower.includes('frozen')) return 'shoulder';
  if (lower.includes('hip') || lower.includes('gluteal') || lower.includes('groin') || lower.includes('femoro')) return 'hip';
  if (lower.includes('knee') || lower.includes('patell') || lower.includes('acl') || lower.includes('meniscus')) return 'knee';
  if (lower.includes('ankle') || lower.includes('achilles') || lower.includes('plantar')) return 'ankle';
  if (lower.includes('lumbar') || lower.includes('low back') || lower.includes('spinal') || lower.includes('disc')) return 'lumbar';
  if (lower.includes('cervical') || lower.includes('neck') || lower.includes('whiplash')) return 'cervical';
  if (lower.includes('thoracic')) return 'thoracic';
  if (lower.includes('hamstring')) return 'hip';
  if (lower.includes('wrist') || lower.includes('carpal')) return 'wrist';
  return '';
}

function inferEvidenceGrade(evidenceStr: string): EvidenceGradeLevel {
  const lower = evidenceStr.toLowerCase();
  if (lower.includes('strong evidence')) return 'A';
  if (lower.includes('moderate to strong')) return 'A';
  if (lower.includes('moderate evidence')) return 'B';
  if (lower.includes('emerging evidence') || lower.includes('limited evidence')) return 'C';
  return 'Expert';
}

function computeRelevanceScore(
  entry: CatalogEntry,
  input: EvidenceQueryInput,
): number {
  let score = 0;

  if (input.problemClass && entry.problemClassMatch.includes(input.problemClass)) score += 25;
  if (input.mechanism && entry.mechanismMatch.includes(input.mechanism)) score += 25;

  if (entry.evidenceGrade === 'A') score += 20;
  else if (entry.evidenceGrade === 'B') score += 12;
  else if (entry.evidenceGrade === 'C') score += 5;
  else score += 2;

  if (input.bodyRegions && input.bodyRegions.length > 0) {
    const regionMatch = input.bodyRegions.some(r =>
      entry.targetRegions.some(tr => tr.includes(r.toLowerCase()) || r.toLowerCase().includes(tr))
    );
    if (regionMatch) score += 15;
  }

  if (input.diagnosis) {
    const diagLower = input.diagnosis.toLowerCase();
    const keywordMatch = entry.conditionKeywords.some(k => diagLower.includes(k) || k.includes(diagLower.split(' ')[0]));
    if (keywordMatch) score += 10;
  }

  if (input.tissuePathology) {
    const pathLower = input.tissuePathology.toLowerCase();
    if (entry.conditionKeywords.some(k => pathLower.includes(k))) score += 8;
  }

  if (input.patientContext?.sport && entry.sourceLibrary === 'Sports Map') score += 5;

  if (input.biomechanics?.faults?.length) {
    const faultLabels = input.biomechanics.faults.map(f => f.label.toLowerCase());
    if (entry.conditionKeywords.some(k => faultLabels.some(f => f.includes(k)))) score += 5;
    if (['motor_control_retraining', 'progressive_strengthening', 'stretching_programme'].includes(entry.id)) {
      score += Math.min(8, input.biomechanics.faults.length * 2);
    }
  }

  if (input.sling?.weakLinks?.length) {
    if (['motor_control_retraining', 'isometric_loading', 'progressive_strengthening'].includes(entry.id)) {
      score += Math.min(10, input.sling.weakLinks.length * 3);
    }
  }
  if (input.sling?.forceTransferScore !== undefined && input.sling.forceTransferScore < 70) {
    if (['motor_control_retraining', 'progressive_strengthening'].includes(entry.id)) {
      score += Math.min(8, Math.round((70 - input.sling.forceTransferScore) * 0.2));
    }
  }

  if (input.loadTolerance) {
    if (input.loadTolerance === 'low') {
      if (['isometric_loading', 'pain_neuroscience_education', 'joint_mob_grade_1_2'].includes(entry.id)) score += 8;
      if (entry.stageRestrictions.includes('acute')) score -= 5;
    } else if (input.loadTolerance === 'high') {
      if (['progressive_strengthening', 'eccentric_programme', 'graded_exposure'].includes(entry.id)) score += 6;
      if (entry.category === 'exercise') score += 3;
    }
  }

  if (input.patientContext) {
    const ctx = input.patientContext;

    if (ctx.adherenceLevel === 'low') {
      if (entry.category === 'education') score += 5;
      if (entry.id === 'pain_neuroscience_education') score += 4;
    } else if (ctx.adherenceLevel === 'high') {
      if (entry.category === 'exercise') score += 3;
    }

    if (ctx.activityLevel === 'athlete' || ctx.sport) {
      if (entry.sourceLibrary === 'Sports Map') score += 7;
      if (entry.category === 'load_management') score += 4;
    }

    if (ctx.goals?.length) {
      const goalStr = ctx.goals.join(' ').toLowerCase();
      if (goalStr.includes('return to sport') || goalStr.includes('competition')) {
        if (entry.category === 'exercise' || entry.category === 'load_management') score += 4;
      }
      if (goalStr.includes('pain') || goalStr.includes('relief')) {
        if (entry.category === 'manual_therapy' || entry.category === 'education') score += 4;
      }
      if (goalStr.includes('mobility') || goalStr.includes('flexibility')) {
        if (entry.problemClassMatch.includes('mobility_restriction')) score += 4;
      }
    }

    if (ctx.equipment?.length) {
      const equipLower = ctx.equipment.map(e => e.toLowerCase());
      const descLower = entry.description.toLowerCase();
      if (equipLower.some(e => descLower.includes(e))) score += 3;
    }

    if (ctx.workDemands) {
      const workLower = ctx.workDemands.toLowerCase();
      if ((workLower.includes('sedentary') || workLower.includes('desk')) && entry.category === 'exercise') score += 2;
      if ((workLower.includes('manual') || workLower.includes('heavy')) && entry.category === 'load_management') score += 3;
    }
  }

  if (input.tissueType) {
    const tissueLower = input.tissueType.toLowerCase();
    if (tissueLower.includes('tendon') && entry.conditionKeywords.some(k => k.includes('tendin') || k.includes('tendon'))) score += 8;
    if (tissueLower.includes('muscle') && entry.conditionKeywords.some(k => k.includes('muscle') || k.includes('strain') || k.includes('strength'))) score += 8;
    if (tissueLower.includes('nerve') && (entry.category === 'neural' || entry.conditionKeywords.some(k => k.includes('neural') || k.includes('nerve')))) score += 8;
    if (tissueLower.includes('joint') && entry.category === 'manual_therapy') score += 6;
    if (tissueLower.includes('fascia') && entry.conditionKeywords.some(k => k.includes('fascia') || k.includes('myofascial'))) score += 8;
  }

  return Math.min(100, score);
}

function checkStageAppropriateness(entry: CatalogEntry, stage?: ConditionStageType): boolean {
  if (!stage) return true;
  return !entry.stageRestrictions.includes(stage);
}

function checkLoadCompatibility(entry: CatalogEntry, loadTolerance?: LoadLevel): boolean {
  if (!loadTolerance) return true;
  const loadOrder: LoadLevel[] = ['low', 'moderate', 'high'];
  const patientIdx = loadOrder.indexOf(loadTolerance);
  const demandIdx = loadOrder.indexOf(entry.loadDemand);
  return demandIdx <= patientIdx;
}

function checkIrritabilityCompatibility(entry: CatalogEntry, irritability?: IrritabilityLevel): boolean {
  if (!irritability) return true;
  const order: IrritabilityLevel[] = ['low', 'moderate', 'high'];
  return order.indexOf(irritability) <= order.indexOf(entry.irritabilityMax);
}

function checkTissueMatch(entry: CatalogEntry, tissueType?: string, tissuePathology?: string): boolean {
  if (!tissueType && !tissuePathology) return true;
  const searchTerms = [tissueType, tissuePathology].filter(Boolean).map(s => s!.toLowerCase());
  return searchTerms.some(t =>
    entry.conditionKeywords.some(k => k.includes(t) || t.includes(k)) ||
    entry.description.toLowerCase().includes(t)
  );
}

function mapExerciseCategoryToEvidence(cat: CatalogExercise['category']): EvidenceCategory {
  switch (cat) {
    case 'strengthening': return 'exercise';
    case 'stretching': return 'exercise';
    case 'mobility': return 'exercise';
    case 'neuromuscular': return 'neural';
    case 'functional': return 'exercise';
    case 'stabilization': return 'exercise';
    case 'manual': return 'manual_therapy';
  }
}

function exerciseProblemClasses(cat: CatalogExercise['category']): ProblemClass[] {
  switch (cat) {
    case 'strengthening': return ['load_capacity'];
    case 'stretching': return ['mobility_restriction'];
    case 'mobility': return ['mobility_restriction'];
    case 'neuromuscular': return ['coordination_control'];
    case 'functional': return ['load_capacity', 'coordination_control'];
    case 'stabilization': return ['instability', 'coordination_control'];
    case 'manual': return ['mobility_restriction', 'compression'];
  }
}

function exerciseMechanisms(cat: CatalogExercise['category']): DominantMechanism[] {
  switch (cat) {
    case 'strengthening': return ['tensile_load'];
    case 'stretching': return ['stiffness'];
    case 'mobility': return ['stiffness'];
    case 'neuromuscular': return ['motor_control'];
    case 'functional': return ['tensile_load', 'motor_control'];
    case 'stabilization': return ['instability', 'motor_control'];
    case 'manual': return ['stiffness', 'compression'];
  }
}

function buildExerciseCatalogEntries(): CatalogEntryWithoutLoad[] {
  return EXERCISE_CATALOG.map((ex: CatalogExercise) => {
    const slingLabel = ex.targetSling ? ` (targets ${ex.targetSling.replace(/_/g, ' ')} sling)` : '';
    const equipNote = ex.equipment.length > 0 ? ` Equipment: ${ex.equipment.join(', ')}.` : ' No equipment needed.';
    const holdNote = ex.baseHold ? `, ${ex.baseHold}s hold` : '';
    const isManual = ex.category === 'manual';

    return {
      id: `exercise_${ex.id}`,
      name: ex.name,
      category: mapExerciseCategoryToEvidence(ex.category),
      description: `${ex.name} — ${ex.category} exercise for ${ex.bodyParts.join(', ')}${slingLabel}.${equipNote}${ex.mobilisationGrade ? ` Grade: ${ex.mobilisationGrade}.` : ''}`,
      dosage: `${ex.baseSets} × ${ex.baseReps}${holdNote}`,
      rationale: isManual
        ? `Manual therapy technique targeting ${ex.bodyParts.join('/')} for joint/soft tissue restoration`
        : `${ex.category.charAt(0).toUpperCase() + ex.category.slice(1)} exercise targeting ${ex.bodyParts.join(', ')} region`,
      mechanismOfAction: isManual
        ? 'Neurophysiological pain modulation and/or mechanical tissue change via manual input'
        : `Progressive ${ex.category} stimulus driving tissue adaptation in ${ex.bodyParts.join(', ')}`,
      evidenceGrade: 'B' as EvidenceGradeLevel,
      targetRegions: ex.bodyParts,
      contraindications: isManual ? ['fracture', 'malignancy', 'active infection'] : [],
      stageRestrictions: (isManual && ex.mobilisationGrade?.includes('3'))
        ? ['acute' as ConditionStageType]
        : [] as ConditionStageType[],
      irritabilityMax: (isManual ? 'moderate' : 'high') as IrritabilityLevel,
      problemClassMatch: exerciseProblemClasses(ex.category),
      mechanismMatch: exerciseMechanisms(ex.category),
      references: [],
      sourceLibrary: 'exercise_catalog',
      conditionKeywords: [
        ...ex.bodyParts,
        ex.category,
        ...(ex.targetSling ? [ex.targetSling.replace(/_/g, ' ')] : []),
        ...(ex.targetStructure ? [ex.targetStructure.toLowerCase()] : []),
        ex.name.toLowerCase(),
      ],
      expectedTimeframe: isManual ? 'Immediate effect; 2-6 sessions for sustained change' : '4-12 weeks for measurable gains',
    };
  });
}

function mapEvidenceLevel(level: string): EvidenceGradeLevel {
  switch (level) {
    case 'level_1': return 'A';
    case 'level_2': return 'A';
    case 'level_3': return 'B';
    case 'level_4': return 'C';
    case 'level_5': return 'Expert';
    default: return 'B';
  }
}

function mapBodyPartToRegion(bodyPart: string): string {
  const map: Record<string, string> = {
    shoulder: 'shoulder', neck: 'cervical', back: 'lumbar', elbow: 'elbow',
    wrist: 'wrist', hand: 'hand', hip: 'hip', knee: 'knee',
    ankle: 'ankle', foot: 'ankle', general: 'general', other: 'general',
  };
  return map[bodyPart] || bodyPart;
}

function inferCategoryFromStudy(paper: typeof allResearchPapers[number]): EvidenceCategory {
  const titleLower = paper.title.toLowerCase();
  const abstractLower = (paper.abstract || '').toLowerCase();
  const combined = titleLower + ' ' + abstractLower;
  if (combined.includes('manual therapy') || combined.includes('mobilisation') || combined.includes('manipulation')) return 'manual_therapy';
  if (combined.includes('education') || combined.includes('neuroscience education') || combined.includes('self-management')) return 'education';
  if (combined.includes('neural') || combined.includes('neurodynamic')) return 'neural';
  if (combined.includes('load management') || combined.includes('workload')) return 'load_management';
  if (combined.includes('exercise') || combined.includes('strengthening') || combined.includes('rehabilitation')) return 'exercise';
  return 'exercise';
}

function inferProblemClassFromStudy(paper: typeof allResearchPapers[number]): ProblemClass[] {
  const combined = (paper.title + ' ' + (paper.abstract || '')).toLowerCase();
  const classes: ProblemClass[] = [];
  if (combined.includes('strength') || combined.includes('load') || combined.includes('tendin')) classes.push('load_capacity');
  if (combined.includes('range of motion') || combined.includes('stiffness') || combined.includes('mobility')) classes.push('mobility_restriction');
  if (combined.includes('stability') || combined.includes('instability') || combined.includes('laxity')) classes.push('instability');
  if (combined.includes('motor control') || combined.includes('coordination') || combined.includes('neuromuscular')) classes.push('coordination_control');
  if (combined.includes('sensitisation') || combined.includes('sensitization') || combined.includes('chronic pain')) classes.push('sensitivity_dominant');
  if (combined.includes('compression') || combined.includes('impingement') || combined.includes('stenosis')) classes.push('compression');
  return classes.length > 0 ? classes : ['load_capacity'];
}

function inferMechanismFromStudy(paper: typeof allResearchPapers[number]): DominantMechanism[] {
  const combined = (paper.title + ' ' + (paper.abstract || '')).toLowerCase();
  const mechs: DominantMechanism[] = [];
  if (combined.includes('tensile') || combined.includes('tendin') || combined.includes('loading')) mechs.push('tensile_load');
  if (combined.includes('compression') || combined.includes('impingement')) mechs.push('compression');
  if (combined.includes('stiffness') || combined.includes('capsular') || combined.includes('adhesive')) mechs.push('stiffness');
  if (combined.includes('motor control') || combined.includes('neuromuscular')) mechs.push('motor_control');
  if (combined.includes('instability') || combined.includes('laxity')) mechs.push('instability');
  if (combined.includes('sensitisation') || combined.includes('sensitization') || combined.includes('central')) mechs.push('sensitisation');
  return mechs.length > 0 ? mechs : ['tensile_load'];
}

function buildResearchDatabaseEntries(): CatalogEntryWithoutLoad[] {
  return allResearchPapers.map((paper, idx) => {
    const region = mapBodyPartToRegion(paper.bodyPart);
    const protocols = paper.treatmentProtocols || [];
    const dosageStr = protocols.length > 0
      ? protocols.map(p => `${p.intervention}: ${p.dosage}, ${p.frequency}, ${p.duration}`).join('; ')
      : 'See study protocol';
    const titleWords = paper.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    return {
      id: `research_${paper.pubmedId || idx}`,
      name: paper.title,
      category: inferCategoryFromStudy(paper),
      description: paper.aiSummary || paper.abstract,
      dosage: dosageStr,
      rationale: paper.clinicalRelevance,
      mechanismOfAction: paper.keyFindings?.join('; ') || paper.aiSummary || '',
      evidenceGrade: mapEvidenceLevel(paper.evidenceLevel),
      targetRegions: [region],
      contraindications: paper.contraindications || [],
      stageRestrictions: [] as ConditionStageType[],
      irritabilityMax: 'high' as IrritabilityLevel,
      problemClassMatch: inferProblemClassFromStudy(paper),
      mechanismMatch: inferMechanismFromStudy(paper),
      references: [{
        authors: paper.authors,
        year: paper.year,
        title: paper.title,
        journal: paper.journal,
        pmid: paper.pubmedId || undefined,
      }],
      sourceLibrary: 'research_database',
      conditionKeywords: [
        paper.bodyPart,
        region,
        ...titleWords.slice(0, 8),
        ...(paper.practicalApplications || []).flatMap(a => a.toLowerCase().split(/\s+/).filter(w => w.length > 4)).slice(0, 5),
      ],
    };
  });
}

export function queryEvidenceEngine(input: EvidenceQueryInput): EvidenceQueryResult {
  const resolvedInput = resolveFromStructuredReasoning(input);

  let filtered = UNIFIED_CATALOG.filter(entry => {
    if (resolvedInput.bodyRegions && resolvedInput.bodyRegions.length > 0) {
      const hasRegionMatch = entry.targetRegions.some(tr =>
        resolvedInput.bodyRegions!.some(r => tr.includes(r.toLowerCase()) || r.toLowerCase().includes(tr))
      ) || entry.targetRegions.includes('general');
      if (!hasRegionMatch) return false;
    }

    const relevance = computeRelevanceScore(entry, resolvedInput);
    return relevance > 10;
  });

  const options: EvidenceOption[] = filtered.map(entry => {
    const relevanceScore = computeRelevanceScore(entry, resolvedInput);
    const stageAppropriateness = checkStageAppropriateness(entry, resolvedInput.stage);
    const loadCompatibility = checkLoadCompatibility(entry, resolvedInput.loadTolerance);
    const irritabilityCompatible = checkIrritabilityCompatibility(entry, resolvedInput.irritability);
    const tissueMatch = checkTissueMatch(entry, resolvedInput.tissueType, resolvedInput.tissuePathology);

    const riskFlags: string[] = [];
    if (!stageAppropriateness) riskFlags.push(`Not recommended in ${resolvedInput.stage} stage`);
    if (!loadCompatibility) riskFlags.push(`Load demand (${entry.loadDemand}) exceeds patient tolerance (${resolvedInput.loadTolerance})`);
    if (!irritabilityCompatible) riskFlags.push(`Irritability (${resolvedInput.irritability}) exceeds max (${entry.irritabilityMax})`);

    return {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      evidenceGrade: entry.evidenceGrade,
      relevanceScore,
      description: entry.description,
      dosage: entry.dosage,
      rationale: entry.rationale,
      mechanismOfAction: entry.mechanismOfAction,
      targetRegions: entry.targetRegions,
      stageAppropriateness,
      loadCompatibility,
      riskFlags,
      contraindications: entry.contraindications,
      tissueMatch,
      references: entry.references,
      sourceLibrary: entry.sourceLibrary,
      expertApproach: entry.expertApproach,
      problemClassMatch: entry.problemClassMatch,
      mechanismMatch: entry.mechanismMatch,
      linkedTechniqueDbKeys: entry.linkedTechniqueDbKeys,
      expectedTimeframe: entry.expectedTimeframe,
      irritabilityMax: entry.irritabilityMax,
    };
  });

  options.sort((a, b) => {
    if (a.riskFlags.length !== b.riskFlags.length) return a.riskFlags.length - b.riskFlags.length;
    return b.relevanceScore - a.relevanceScore;
  });

  const gradeDistribution: Record<EvidenceGradeLevel, number> = { A: 0, B: 0, C: 0, Expert: 0 };
  const categoryDistribution: Record<string, number> = {};
  for (const opt of options) {
    gradeDistribution[opt.evidenceGrade]++;
    categoryDistribution[opt.category] = (categoryDistribution[opt.category] || 0) + 1;
  }

  return {
    options: options.slice(0, input.maxResults || 100),
    queryContext: {
      diagnosis: resolvedInput.diagnosis || 'Not specified',
      regions: resolvedInput.bodyRegions || [],
      stage: resolvedInput.stage || 'Not specified',
      irritability: resolvedInput.irritability || 'Not specified',
      mechanism: resolvedInput.mechanism || 'Not specified',
      problemClass: resolvedInput.problemClass || 'Not specified',
    },
    gradeDistribution,
    categoryDistribution,
    timestamp: new Date().toISOString(),
  };
}

function resolveFromStructuredReasoning(input: EvidenceQueryInput): EvidenceQueryInput {
  if (!input.structuredReasoning) return input;
  const sr = input.structuredReasoning;

  return {
    ...input,
    diagnosis: input.diagnosis || sr.hypotheses?.[0]?.condition,
    stage: input.stage || sr.stage?.stage,
    irritability: input.irritability || sr.irritability?.level,
    mechanism: input.mechanism || sr.dominantMechanism?.mechanism,
    problemClass: input.problemClass || sr.problemClass?.primary,
  };
}

export function getEvidenceCatalogStats(): {
  totalEntries: number;
  bySource: Record<string, number>;
  byGrade: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const bySource: Record<string, number> = {};
  const byGrade: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const entry of UNIFIED_CATALOG) {
    bySource[entry.sourceLibrary] = (bySource[entry.sourceLibrary] || 0) + 1;
    byGrade[entry.evidenceGrade] = (byGrade[entry.evidenceGrade] || 0) + 1;
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  }

  return { totalEntries: UNIFIED_CATALOG.length, bySource, byGrade, byCategory };
}
