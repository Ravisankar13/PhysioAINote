import type { MuscleAnalysisResult, IndividualMuscle, ClinicalStatus } from './muscleBiomechanicsEngine';
import type { InfluenceMap, InfluencePathway } from './muscleInfluenceMap';
import type { JointSurfaceForce, ForceAnalysisResult } from './posturalForceEngine';

export type TreatmentAction = 'release' | 'stretch' | 'strengthen' | 'activate' | 'mobilize' | 'stabilize';
export type EvidenceGrade = 'A' | 'B' | 'C' | 'Expert';

export interface EvidenceReference {
  authors: string;
  year: number;
  title: string;
  journal: string;
  pmid?: string;
}

export interface TreatmentTechnique {
  name: string;
  type: 'manual' | 'exercise' | 'modality';
  dosage: string;
  rationale: string;
  evidenceGrade: EvidenceGrade;
  references: EvidenceReference[];
  guidelineSource?: string;
}

export interface Contraindication {
  flag: string;
  severity: 'caution' | 'warning' | 'stop';
  reason: string;
}

export interface PainCorrelation {
  painMarkerId: string;
  painLabel: string;
  mechanism: 'direct' | 'referred' | 'compensatory';
  explanation: string;
}

export interface SyndromeProtocol {
  protocolName: string;
  sourceAuthor: string;
  syndromeId: string;
  description: string;
  techniqueSequence: TreatmentTechnique[];
  phaseNotes: string;
  references: EvidenceReference[];
}

export interface TreatmentTarget {
  targetId: string;
  targetName: string;
  targetType: 'muscle' | 'joint' | 'chain';
  priority: number;
  clinicalStatus: ClinicalStatus;
  treatmentAction: TreatmentAction;
  actionLabel: string;
  isRootCause: boolean;
  isCompensation: boolean;
  rationale: string;
  techniques: TreatmentTechnique[];
  painCorrelations: PainCorrelation[];
  chainContext: { chainName: string; integrity: number }[];
  influenceCount: number;
  dysfunctionScore: number;
  contraindications: Contraindication[];
}

export interface TreatmentSummary {
  totalTargets: number;
  rootCauses: number;
  compensations: number;
  criticalChain: string | null;
  syndromes: string[];
  treatmentSequence: string[];
  syndromeProtocols: SyndromeProtocol[];
}

export interface TreatmentPriorityResult {
  targets: TreatmentTarget[];
  summary: TreatmentSummary;
}

export interface PainMarkerSimple {
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
  severity?: number;
  weight?: number;
  isPredicted?: boolean;
}

export const STATUS_TO_ACTION: Record<ClinicalStatus, { action: TreatmentAction; label: string }> = {
  shortened: { action: 'stretch', label: 'Stretch & Lengthen' },
  overactive: { action: 'release', label: 'Release & Inhibit' },
  inhibited: { action: 'activate', label: 'Activate & Facilitate' },
  weak: { action: 'strengthen', label: 'Strengthen' },
  spasm: { action: 'release', label: 'Release & Relax' },
  lengthened: { action: 'stabilize', label: 'Stabilize & Shorten' },
  normal: { action: 'stabilize', label: 'Maintain' },
};

export const TECHNIQUE_DB: Record<ClinicalStatus, TreatmentTechnique[]> = {
  shortened: [
    {
      name: 'Sustained static stretch',
      type: 'exercise',
      dosage: '2-4 × 30-60s holds, 5-7 days/week',
      rationale: 'Restore resting length via viscoelastic creep and sarcomere remodeling',
      evidenceGrade: 'A',
      references: [
        { authors: 'Page P', year: 2012, title: 'Current concepts in muscle stretching for exercise and rehabilitation', journal: 'Int J Sports Phys Ther', pmid: '22319684' },
        { authors: 'Bandy WD, Irion JM, Briggler M', year: 1997, title: 'The effect of time and frequency of static stretching on flexibility of the hamstring muscles', journal: 'Phys Ther', pmid: '9256869' },
      ],
      guidelineSource: 'ACSM Guidelines 2021',
    },
    {
      name: 'Myofascial release (manual)',
      type: 'manual',
      dosage: '3-5 min per area, moderate pressure',
      rationale: 'Reduce fascial restrictions via thixotropic and neurophysiological mechanisms',
      evidenceGrade: 'B',
      references: [
        { authors: 'Ajimsha MS, Al-Mudahka NR, Al-Madzhar JA', year: 2015, title: 'Effectiveness of myofascial release: systematic review of randomized controlled trials', journal: 'J Bodyw Mov Ther', pmid: '25603749' },
      ],
      guidelineSource: 'JOSPT CPG 2017',
    },
    {
      name: 'Eccentric loading program',
      type: 'exercise',
      dosage: '3 × 12 reps, slow 4s eccentric phase, 3×/week',
      rationale: 'Promote sarcomere addition in series and restore optimal length-tension relationship',
      evidenceGrade: 'A',
      references: [
        { authors: 'O\'Sullivan K, McAuliffe S, DeBurca N', year: 2012, title: 'The effects of eccentric training on lower limb flexibility', journal: 'Br J Sports Med', pmid: '22267572' },
        { authors: 'Alfredson H, Pietila T, Jonsson P, Lorentzon R', year: 1998, title: 'Heavy-load eccentric calf muscle training for treatment of chronic Achilles tendinosis', journal: 'Am J Sports Med', pmid: '9617396' },
      ],
    },
    {
      name: 'Contract-relax PNF stretching',
      type: 'exercise',
      dosage: '3-5 reps: 6s isometric contraction → 30s stretch',
      rationale: 'Utilize autogenic inhibition via Golgi tendon organ for greater ROM gains',
      evidenceGrade: 'A',
      references: [
        { authors: 'Sharman MJ, Cresswell AG, Riek S', year: 2006, title: 'Proprioceptive neuromuscular facilitation stretching: mechanisms and clinical implications', journal: 'Sports Med', pmid: '16573356' },
        { authors: 'Hindle KB, Whitcomb TJ, Briggs WO, Hong J', year: 2012, title: 'Proprioceptive neuromuscular facilitation: its mechanisms and effects on ROM and muscular function', journal: 'J Hum Kinet', pmid: '23486850' },
      ],
    },
    {
      name: 'Instrument-assisted soft tissue mobilization',
      type: 'manual',
      dosage: '3-5 min per region, moderate intensity',
      rationale: 'Mechanical breakdown of collagen cross-links and stimulation of fibroblast activity',
      evidenceGrade: 'B',
      references: [
        { authors: 'Cheatham SW, Lee M, Cain M, Baker R', year: 2016, title: 'The efficacy of instrument assisted soft tissue mobilization: a systematic review', journal: 'J Can Chiropr Assoc', pmid: '27069265' },
      ],
    },
  ],
  overactive: [
    {
      name: 'Inhibitory trigger point pressure release',
      type: 'manual',
      dosage: '60-90s sustained pressure per point, 3-5 points',
      rationale: 'Reduce motor neuron excitability via autogenic inhibition and local ischemic compression',
      evidenceGrade: 'B',
      references: [
        { authors: 'Simons DG, Travell JG, Simons LS', year: 1999, title: 'Travell & Simons\' Myofascial Pain and Dysfunction: The Trigger Point Manual', journal: 'Lippincott Williams & Wilkins' },
        { authors: 'Cagnie B, Castelein B, Pollie F, Steelant L, Verhoeyen H, Cools A', year: 2015, title: 'Evidence for the use of ischemic compression and dry needling in the management of trigger points', journal: 'J Manipulative Physiol Ther', pmid: '26547763' },
      ],
    },
    {
      name: 'Reciprocal inhibition exercise',
      type: 'exercise',
      dosage: '3 × 15 reps antagonist activation, 2s hold',
      rationale: 'Sherrington\'s law of reciprocal inhibition — antagonist activation reflexively inhibits overactive agonist',
      evidenceGrade: 'B',
      references: [
        { authors: 'Crone C', year: 1993, title: 'Reciprocal inhibition in man', journal: 'Dan Med Bull', pmid: '8222755' },
        { authors: 'Page P, Frank CC, Lardner R', year: 2010, title: 'Assessment and Treatment of Muscle Imbalance: The Janda Approach', journal: 'Human Kinetics' },
      ],
    },
    {
      name: 'Foam rolling / self-myofascial release',
      type: 'exercise',
      dosage: '2-3 min per region, slow rolling at 1 inch/sec',
      rationale: 'Mechanical reduction of tone via autogenic inhibition and increased parasympathetic activity',
      evidenceGrade: 'A',
      references: [
        { authors: 'Beardsley C, Skarabot J', year: 2015, title: 'Effects of self-myofascial release: a systematic review', journal: 'J Bodyw Mov Ther', pmid: '26592226' },
        { authors: 'Cheatham SW, Kolber MJ, Cain M, Lee M', year: 2015, title: 'The effects of self-myofascial release using a foam roll or roller massager on joint ROM, muscle recovery, and performance: a systematic review', journal: 'Int J Sports Phys Ther', pmid: '26618062' },
      ],
    },
    {
      name: 'Dry needling',
      type: 'manual',
      dosage: '2-3 insertions per trigger point, elicit LTR',
      rationale: 'Elicit local twitch response to reset motor end plate dysfunction and reduce spontaneous electrical activity',
      evidenceGrade: 'A',
      references: [
        { authors: 'Gattie E, Cleland JA, Snodgrass S', year: 2017, title: 'The effectiveness of trigger point dry needling for musculoskeletal conditions: a systematic review and meta-analysis', journal: 'J Orthop Sports Phys Ther', pmid: '28622488' },
      ],
      guidelineSource: 'APTA CPG 2013',
    },
  ],
  inhibited: [
    {
      name: 'Isolated isometric activation',
      type: 'exercise',
      dosage: '3 × 10s holds × 10 reps, submaximal effort progressing to maximal',
      rationale: 'Re-establish motor recruitment patterns via low-threshold motor unit activation',
      evidenceGrade: 'B',
      references: [
        { authors: 'Jull GA, Falla D, Vicenzino B, Hodges PW', year: 2009, title: 'The effect of therapeutic exercise on activation of the deep cervical flexor muscles in people with chronic neck pain', journal: 'Man Ther', pmid: '18793867' },
      ],
    },
    {
      name: 'Neuromuscular electrical stimulation (NMES)',
      type: 'modality',
      dosage: '15-20 min, 35-50 Hz, with active co-contraction',
      rationale: 'Facilitate motor unit recruitment by externally depolarizing motor neurons, overcoming arthrogenic inhibition',
      evidenceGrade: 'A',
      references: [
        { authors: 'Snyder-Mackler L, Delitto A, Bailey SL, Stralka SW', year: 1995, title: 'Strength of the quadriceps femoris muscle and functional recovery after reconstruction of the anterior cruciate ligament', journal: 'J Bone Joint Surg Am', pmid: '7822354' },
        { authors: 'Hauger AV, Reiman MP, Bjordal JM, Sheets C, Ledbetter L, Goode AP', year: 2018, title: 'Neuromuscular electrical stimulation is effective in strengthening the quadriceps muscle after anterior cruciate ligament surgery', journal: 'Knee Surg Sports Traumatol Arthrosc', pmid: '28717882' },
      ],
      guidelineSource: 'JOSPT CPG 2017',
    },
    {
      name: 'Tactile cueing with biofeedback',
      type: 'manual',
      dosage: 'Apply during all activation exercises',
      rationale: 'Enhanced proprioceptive input via cutaneous mechanoreceptor stimulation to improve motor recruitment timing',
      evidenceGrade: 'C',
      references: [
        { authors: 'Hides JA, Richardson CA, Jull GA', year: 1996, title: 'Multifidus muscle recovery is not automatic after resolution of acute, first-episode low back pain', journal: 'Spine', pmid: '8961451' },
      ],
    },
    {
      name: 'Motor imagery and mental practice',
      type: 'exercise',
      dosage: '3 × 5 min sessions, combined with physical practice',
      rationale: 'Cortical motor area activation without physical loading — primes neural pathways for muscle recruitment',
      evidenceGrade: 'B',
      references: [
        { authors: 'Malouin F, Richards CL, Jackson PL, Lafleur MF, Durand A, Doyon J', year: 2007, title: 'The Kinesthetic and Visual Imagery Questionnaire for assessing motor imagery', journal: 'Can J Exp Psychol', pmid: '17695899' },
      ],
    },
  ],
  weak: [
    {
      name: 'Progressive resistance training',
      type: 'exercise',
      dosage: '2-4 × 8-12 reps at 60-80% 1RM, 2-3×/week',
      rationale: 'Mechanical overload drives myofibrillar hypertrophy and neural adaptation',
      evidenceGrade: 'A',
      references: [
        { authors: 'American College of Sports Medicine', year: 2009, title: 'Progression models in resistance training for healthy adults', journal: 'Med Sci Sports Exerc', pmid: '19204579' },
      ],
      guidelineSource: 'ACSM Guidelines 2021',
    },
    {
      name: 'Functional compound strengthening',
      type: 'exercise',
      dosage: '3 × 10-15 reps, multi-joint movements',
      rationale: 'Integrate strength gains into functional movement patterns for carryover to daily activities',
      evidenceGrade: 'B',
      references: [
        { authors: 'Siff MC', year: 2003, title: 'Supertraining (6th edition)', journal: 'Supertraining Institute' },
      ],
    },
    {
      name: 'Blood flow restriction (BFR) training',
      type: 'exercise',
      dosage: '30-15-15-15 reps at 20-30% 1RM with 40-80% occlusion',
      rationale: 'Achieve hypertrophy with low loads via metabolic stress — suitable when high loads are contraindicated',
      evidenceGrade: 'A',
      references: [
        { authors: 'Hughes L, Paton B, Rosenblatt B, Gissane C, Patterson SD', year: 2017, title: 'Blood flow restriction training in clinical musculoskeletal rehabilitation: a systematic review and meta-analysis', journal: 'Br J Sports Med', pmid: '28554891' },
      ],
    },
    {
      name: 'Plyometric progression',
      type: 'exercise',
      dosage: '2-3 × 8-10 reps, progressive loading, 2×/week',
      rationale: 'Develop rate of force development and stretch-shortening cycle efficiency for return to sport',
      evidenceGrade: 'B',
      references: [
        { authors: 'Davies G, Riemann BL, Manske R', year: 2015, title: 'Current concepts of plyometric exercise', journal: 'Int J Sports Phys Ther', pmid: '26618058' },
      ],
    },
  ],
  spasm: [
    {
      name: 'Gentle sustained pressure (muscle energy)',
      type: 'manual',
      dosage: '3-5 reps: 5s isometric at 20% MVC → gentle stretch to new barrier',
      rationale: 'Post-isometric relaxation via Golgi tendon organ activation reduces protective muscle guarding',
      evidenceGrade: 'B',
      references: [
        { authors: 'Chaitow L', year: 2006, title: 'Muscle Energy Techniques (3rd ed)', journal: 'Churchill Livingstone' },
        { authors: 'Franke H, Fryer G, Ostelo RW, Kamper SJ', year: 2015, title: 'Muscle energy technique for non-specific low-back pain', journal: 'Cochrane Database Syst Rev', pmid: '25723574' },
      ],
    },
    {
      name: 'Positional release / strain-counterstrain',
      type: 'manual',
      dosage: '90s hold in position of comfort, reassess tender point',
      rationale: 'Reset gamma motor neuron bias by slackening the muscle spindle in the shortened position',
      evidenceGrade: 'C',
      references: [
        { authors: 'Jones LH', year: 1995, title: 'Jones Strain-Counterstrain', journal: 'Jones Strain-Counterstrain Inc' },
      ],
    },
    {
      name: 'Moist heat application',
      type: 'modality',
      dosage: '15-20 min moist heat pack, monitor skin',
      rationale: 'Increase local blood flow, reduce muscle spindle sensitivity, and promote tissue extensibility',
      evidenceGrade: 'C',
      references: [
        { authors: 'Malanga GA, Yan N, Stark J', year: 2015, title: 'Mechanisms and efficacy of heat and cold therapies for musculoskeletal injury', journal: 'Postgrad Med', pmid: '25526231' },
      ],
    },
    {
      name: 'Low-dose TENS for pain-spasm cycle',
      type: 'modality',
      dosage: '20-30 min, conventional TENS (80-100 Hz, 50-80 μs)',
      rationale: 'Gate control mechanism reduces pain perception, interrupting pain-spasm-pain cycle',
      evidenceGrade: 'B',
      references: [
        { authors: 'Johnson MI, Paley CA, Howe TE, Sluka KA', year: 2015, title: 'Transcutaneous electrical nerve stimulation for acute pain', journal: 'Cochrane Database Syst Rev', pmid: '26075732' },
      ],
    },
  ],
  lengthened: [
    {
      name: 'Concentric strengthening in inner range',
      type: 'exercise',
      dosage: '3 × 15-20 reps in shortened position, 3×/week',
      rationale: 'Promote sarcomere absorption to restore optimal resting length and passive tension',
      evidenceGrade: 'B',
      references: [
        { authors: 'Sahrmann SA', year: 2002, title: 'Diagnosis and Treatment of Movement Impairment Syndromes', journal: 'Mosby/Elsevier' },
      ],
    },
    {
      name: 'Postural taping / kinesiology tape',
      type: 'modality',
      dosage: 'Apply with 25-50% tension during functional activities',
      rationale: 'External proprioceptive cue to maintain shortened position while motor patterns are retrained',
      evidenceGrade: 'C',
      references: [
        { authors: 'Morris D, Jones D, Ryan H, Ryan CG', year: 2013, title: 'The clinical effects of Kinesio Tex taping: a systematic review', journal: 'Physiother Theory Pract', pmid: '22924883' },
      ],
    },
    {
      name: 'Isometric holds in shortened position',
      type: 'exercise',
      dosage: '3 × 10-15s holds at end range, moderate effort',
      rationale: 'Develop holding strength at optimal shortened position to counter chronic lengthening',
      evidenceGrade: 'Expert',
      references: [
        { authors: 'Kendall FP, McCreary EK, Provance PG', year: 2005, title: 'Muscles: Testing and Function with Posture and Pain (5th ed)', journal: 'Lippincott Williams & Wilkins' },
      ],
    },
  ],
  normal: [],
};

const SYNDROME_PROTOCOLS: Record<string, SyndromeProtocol> = {
  upper_cross: {
    protocolName: 'Janda Upper Crossed Syndrome Protocol',
    sourceAuthor: 'Vladimir Janda',
    syndromeId: 'upper_cross',
    description: 'Systematic correction of forward head posture pattern: release overactive upper traps/pecs, then activate inhibited deep neck flexors/lower traps, followed by postural re-education.',
    phaseNotes: 'Phase 1 (weeks 1-2): Focus on inhibition and stretching of overactive muscles. Phase 2 (weeks 2-4): Add activation of inhibited muscles. Phase 3 (weeks 4+): Integrate into functional movement patterns.',
    references: [
      { authors: 'Janda V', year: 1988, title: 'Muscles and cervicogenic pain syndromes', journal: 'Physical Therapy of the Cervical and Thoracic Spine' },
      { authors: 'Page P, Frank CC, Lardner R', year: 2010, title: 'Assessment and Treatment of Muscle Imbalance: The Janda Approach', journal: 'Human Kinetics' },
      { authors: 'Fernandez-de-las-Penas C, Alonso-Blanco C, Cuadrado ML, Pareja JA', year: 2006, title: 'Forward head posture and neck mobility in chronic tension-type headache', journal: 'Cephalalgia', pmid: '16472336' },
    ],
    techniqueSequence: [
      {
        name: '1. Upper trapezius / levator scapulae release',
        type: 'manual',
        dosage: 'Sustained pressure 90s per point, then stretch 3 × 30s',
        rationale: 'Inhibit overactive upper traps/levator — must precede lower trap activation per Janda sequence',
        evidenceGrade: 'B',
        references: [{ authors: 'Page P, Frank CC, Lardner R', year: 2010, title: 'Assessment and Treatment of Muscle Imbalance: The Janda Approach', journal: 'Human Kinetics' }],
      },
      {
        name: '2. Pectoral stretch (doorway / corner)',
        type: 'exercise',
        dosage: '3 × 30s, arms at 90° and 135° abduction',
        rationale: 'Lengthen shortened pectorals contributing to protracted shoulder/rounded posture',
        evidenceGrade: 'B',
        references: [{ authors: 'Borstad JD, Ludewig PM', year: 2006, title: 'Comparison of three stretches for the pectoralis minor muscle', journal: 'J Shoulder Elbow Surg', pmid: '16517114' }],
      },
      {
        name: '3. Deep neck flexor (craniocervical flexion) training',
        type: 'exercise',
        dosage: '10 × 10s holds at target pressure (22-30 mmHg), 2×/day',
        rationale: 'Activate inhibited longus colli/capitis — key stabilizers of cervical lordosis per Jull protocol',
        evidenceGrade: 'A',
        references: [{ authors: 'Jull GA, Falla D, Vicenzino B, Hodges PW', year: 2009, title: 'The effect of therapeutic exercise on activation of the deep cervical flexor muscles', journal: 'Man Ther', pmid: '18793867' }],
        guidelineSource: 'JOSPT CPG 2017',
      },
      {
        name: '4. Lower trapezius / serratus anterior activation',
        type: 'exercise',
        dosage: '3 × 10 reps prone Y-raises + wall slides, 2s hold at top',
        rationale: 'Restore scapular upward rotation force couple — counteract upper trap dominance',
        evidenceGrade: 'A',
        references: [{ authors: 'Cools AM, Dewitte V, Lanszweert F, et al', year: 2007, title: 'Rehabilitation of scapular muscle balance', journal: 'Am J Sports Med', pmid: '17293464' }],
      },
      {
        name: '5. Chin tuck with scapular retraction (integrated)',
        type: 'exercise',
        dosage: '3 × 10 reps, 5s hold, seated with back against wall',
        rationale: 'Integrate cervical and scapulothoracic corrections into functional posture',
        evidenceGrade: 'B',
        references: [{ authors: 'Page P, Frank CC, Lardner R', year: 2010, title: 'Assessment and Treatment of Muscle Imbalance: The Janda Approach', journal: 'Human Kinetics' }],
      },
    ],
  },
  lower_cross: {
    protocolName: 'Janda Lower Crossed Syndrome Protocol',
    sourceAuthor: 'Vladimir Janda / Shirley Sahrmann',
    syndromeId: 'lower_cross',
    description: 'Systematic correction of anterior pelvic tilt pattern: release overactive hip flexors/erector spinae, then activate inhibited glutes/deep core, followed by lumbopelvic motor control training.',
    phaseNotes: 'Phase 1 (weeks 1-2): Hip flexor/lumbar release and stretching. Phase 2 (weeks 2-4): Glute and core activation in supported positions. Phase 3 (weeks 4+): Progress to functional loading with neutral spine.',
    references: [
      { authors: 'Janda V', year: 1987, title: 'Muscles and motor control in low back pain: assessment and management', journal: 'Physical Therapy of the Low Back' },
      { authors: 'Sahrmann SA', year: 2002, title: 'Diagnosis and Treatment of Movement Impairment Syndromes', journal: 'Mosby/Elsevier' },
      { authors: 'McGill SM', year: 2007, title: 'Low Back Disorders: Evidence-Based Prevention and Rehabilitation (2nd ed)', journal: 'Human Kinetics' },
    ],
    techniqueSequence: [
      {
        name: '1. Iliopsoas / rectus femoris release and stretch',
        type: 'exercise',
        dosage: 'Half-kneeling hip flexor stretch: 3 × 30-45s with posterior pelvic tilt',
        rationale: 'Reduce adaptive shortening of hip flexors driving anterior pelvic tilt — must precede glute activation',
        evidenceGrade: 'B',
        references: [{ authors: 'Watt JR, Jackson K, Franz JR, Dicharry J, Evans J, Kerrigan DC', year: 2011, title: 'Effect of a supervised hip flexor stretching program on gait in frail elderly patients', journal: 'PM R', pmid: '21570035' }],
      },
      {
        name: '2. Lumbar erector spinae inhibition',
        type: 'manual',
        dosage: 'Sustained pressure along erector spinae, 3-5 min bilateral',
        rationale: 'Reduce overactive superficial paraspinals to allow deep stabilizer recruitment (multifidus)',
        evidenceGrade: 'C',
        references: [{ authors: 'McGill SM', year: 2007, title: 'Low Back Disorders: Evidence-Based Prevention and Rehabilitation', journal: 'Human Kinetics' }],
      },
      {
        name: '3. Glute max isolation (bridge progression)',
        type: 'exercise',
        dosage: '3 × 10-15 reps supine bridge, 5s hold, progress to single leg',
        rationale: 'Re-establish hip extension motor pattern — glute max as primary extensor over hamstring substitution',
        evidenceGrade: 'A',
        references: [{ authors: 'Distefano LJ, Blackburn JT, Marshall SW, Padua DA', year: 2009, title: 'Gluteal muscle activation during common therapeutic exercises', journal: 'J Orthop Sports Phys Ther', pmid: '19521015' }],
        guidelineSource: 'JOSPT CPG 2012',
      },
      {
        name: '4. Deep core activation (transversus abdominis draw-in)',
        type: 'exercise',
        dosage: '10 × 10s holds supine, progress to quadruped/standing',
        rationale: 'Activate deep stabilizers to control lumbopelvic neutral — per Hodges motor control model',
        evidenceGrade: 'A',
        references: [
          { authors: 'Hodges PW, Richardson CA', year: 1996, title: 'Inefficient muscular stabilization of the lumbar spine associated with low back pain', journal: 'Spine', pmid: '8961451' },
          { authors: 'Hides JA, Jull GA, Richardson CA', year: 2001, title: 'Long-term effects of specific stabilizing exercises for first-episode low back pain', journal: 'Spine', pmid: '11389408' },
        ],
        guidelineSource: 'JOSPT LBP CPG 2012',
      },
      {
        name: '5. Lumbopelvic motor control integration',
        type: 'exercise',
        dosage: '3 × 8-10 reps deadlift/squat pattern with neutral spine cue',
        rationale: 'Integrate hip hinge pattern with proper lumbopelvic control under increasing load',
        evidenceGrade: 'B',
        references: [{ authors: 'Sahrmann SA', year: 2002, title: 'Diagnosis and Treatment of Movement Impairment Syndromes', journal: 'Mosby/Elsevier' }],
      },
    ],
  },
  layer_syndrome: {
    protocolName: 'Janda Layer Syndrome Protocol',
    sourceAuthor: 'Vladimir Janda',
    syndromeId: 'layer_syndrome',
    description: 'Alternating layers of tight and weak muscles from head to foot — combines elements of both upper and lower crossed syndromes with additional thoracolumbar involvement.',
    phaseNotes: 'Address in a proximal-to-distal sequence. Phase 1: Cervicothoracic correction. Phase 2: Thoracolumbar junction. Phase 3: Lumbopelvic region. Phase 4: Integrated functional training.',
    references: [
      { authors: 'Janda V', year: 1987, title: 'Muscles and motor control in low back pain', journal: 'Physical Therapy of the Low Back' },
      { authors: 'Page P, Frank CC, Lardner R', year: 2010, title: 'Assessment and Treatment of Muscle Imbalance: The Janda Approach', journal: 'Human Kinetics' },
    ],
    techniqueSequence: [
      {
        name: '1. Global inhibition of overactive layers',
        type: 'manual',
        dosage: 'Systematic release: upper traps → thoracolumbar erectors → hamstrings',
        rationale: 'Address alternating hypertonicity layers before attempting activation of inhibited layers',
        evidenceGrade: 'Expert',
        references: [{ authors: 'Page P, Frank CC, Lardner R', year: 2010, title: 'Assessment and Treatment of Muscle Imbalance: The Janda Approach', journal: 'Human Kinetics' }],
      },
      {
        name: '2. Segmental stabilization at thoracolumbar junction',
        type: 'exercise',
        dosage: '3 × 10 reps quadruped alternating arm/leg raise with neutral spine',
        rationale: 'Thoracolumbar junction is the intersection point of upper and lower patterns — critical stabilization zone',
        evidenceGrade: 'B',
        references: [{ authors: 'McGill SM', year: 2007, title: 'Low Back Disorders', journal: 'Human Kinetics' }],
      },
      {
        name: '3. Integrated postural re-education',
        type: 'exercise',
        dosage: 'Wall angel + squat-to-stand pattern, 3 × 8-10 reps',
        rationale: 'Simultaneously train cervicothoracic and lumbopelvic alignment in functional positions',
        evidenceGrade: 'Expert',
        references: [{ authors: 'Janda V', year: 1987, title: 'Muscles and motor control in low back pain', journal: 'Physical Therapy of the Low Back' }],
      },
    ],
  },
};

function checkContraindications(
  target: { groupId: string; dominantStatus: ClinicalStatus; muscles: IndividualMuscle[] },
  allTargets: Map<string, { muscles: IndividualMuscle[]; maxSeverity: number; dominantStatus: ClinicalStatus }>,
  painMarkers: PainMarkerSimple[],
  chainIntegrityScores: Record<string, number>,
  syndromes: string[]
): Contraindication[] {
  const flags: Contraindication[] = [];

  if (target.dominantStatus === 'spasm') {
    const adjacentInhibited = Array.from(allTargets.entries()).some(([id, data]) =>
      id !== target.groupId && data.dominantStatus === 'inhibited' &&
      areGroupsAdjacent(target.groupId, id)
    );
    if (adjacentInhibited) {
      flags.push({
        flag: 'Possible neural involvement',
        severity: 'warning',
        reason: 'Spasm with adjacent inhibition may indicate nerve root irritation or radiculopathy. Screen for neural signs (dermatomes, myotomes, reflexes) before aggressive manual therapy.',
      });
    }
  }

  const side = target.groupId.endsWith('_l') ? '_l' : target.groupId.endsWith('_r') ? '_r' : null;
  if (side) {
    const oppositeSide = side === '_l' ? '_r' : '_l';
    const baseGroup = target.groupId.replace(side, '');
    const oppositeGroup = baseGroup + oppositeSide;
    const oppositeData = allTargets.get(oppositeGroup);
    if (oppositeData && oppositeData.dominantStatus !== 'normal') {
      flags.push({
        flag: 'Bilateral involvement detected',
        severity: 'caution',
        reason: `Both ${baseGroup.replace(/_/g, ' ')} sides are affected. Consider central/systemic causes (inflammatory condition, central sensitization, medication effects) before treating as local dysfunction.`,
      });
    }
  }

  if (target.dominantStatus === 'spasm') {
    const nearbyPainMarkers = painMarkers.filter(pm => {
      const groups = positionToRegionGroups(pm.position);
      return groups.includes(target.groupId);
    });
    const severePain = nearbyPainMarkers.some(pm => (pm.severity || 5) >= 7);
    if (severePain) {
      flags.push({
        flag: 'Avoid aggressive stretching',
        severity: 'stop',
        reason: 'High-severity pain combined with muscle spasm. Use gentle positional release and pain-free modalities only. Aggressive stretching may worsen protective guarding.',
      });
    }
  }

  const criticalChains = Object.values(chainIntegrityScores).filter(s => s < 40).length;
  if (criticalChains >= 2) {
    flags.push({
      flag: 'Significant kinetic chain disruption',
      severity: 'warning',
      reason: 'Multiple kinetic chains are critically compromised. Prioritize stabilization exercises before mobilization to prevent compensatory overload.',
    });
  }

  if (syndromes.length > 0 && painMarkers.some(pm => (pm.severity || 5) >= 6)) {
    flags.push({
      flag: 'Chronic pattern with acute overlay',
      severity: 'caution',
      reason: 'Detected chronic postural syndrome with acute pain markers. Address acute symptoms and pain management first before correcting chronic postural imbalances.',
    });
  }

  return flags;
}

function areGroupsAdjacent(a: string, b: string): boolean {
  const adjacency: Record<string, string[]> = {
    neck: ['scapula_l', 'scapula_r', 'chest', 'spine'],
    chest: ['neck', 'deltoid_l', 'deltoid_r', 'scapula_l', 'scapula_r', 'core'],
    spine: ['neck', 'core', 'scapula_l', 'scapula_r'],
    core: ['spine', 'chest', 'glute_l', 'glute_r'],
    scapula_l: ['neck', 'chest', 'spine', 'deltoid_l'],
    scapula_r: ['neck', 'chest', 'spine', 'deltoid_r'],
    deltoid_l: ['scapula_l', 'chest', 'bicep_l'],
    deltoid_r: ['scapula_r', 'chest', 'bicep_r'],
    bicep_l: ['deltoid_l'], bicep_r: ['deltoid_r'],
    glute_l: ['core', 'quad_l'], glute_r: ['core', 'quad_r'],
    quad_l: ['glute_l', 'calf_l'], quad_r: ['glute_r', 'calf_r'],
    calf_l: ['quad_l', 'shin_l'], calf_r: ['quad_r', 'shin_r'],
    shin_l: ['calf_l'], shin_r: ['calf_r'],
  };
  return adjacency[a]?.includes(b) || false;
}

function positionToRegionGroups(pos: { x: number; y: number; z: number }): string[] {
  const groups: string[] = [];
  const side = pos.x < 0 ? '_l' : '_r';

  if (pos.y > 1.5) {
    groups.push('neck');
  } else if (pos.y > 1.2) {
    groups.push(`scapula${side}`, `deltoid${side}`, 'chest', 'spine');
  } else if (pos.y > 0.9) {
    groups.push('spine', 'core', `glute${side}`);
  } else if (pos.y > 0.5) {
    groups.push(`quad${side}`, `glute${side}`);
  } else if (pos.y > 0.2) {
    groups.push(`calf${side}`, `quad${side}`);
  } else {
    groups.push(`shin${side}`, `calf${side}`);
  }

  return groups;
}

export function computeTreatmentPriorities(
  muscleAnalysis: MuscleAnalysisResult,
  influenceMap: InfluenceMap,
  chainIntegrityScores: Record<string, number>,
  painMarkers: PainMarkerSimple[]
): TreatmentPriorityResult {
  const targets: TreatmentTarget[] = [];
  const abnormalMuscles = muscleAnalysis.allMuscles.filter(m => m.clinicalStatus !== 'normal');
  if (abnormalMuscles.length === 0) {
    return {
      targets: [],
      summary: {
        totalTargets: 0,
        rootCauses: 0,
        compensations: 0,
        criticalChain: null,
        syndromes: [],
        treatmentSequence: [],
        syndromeProtocols: [],
      }
    };
  }

  const groupDysfunction = new Map<string, { muscles: IndividualMuscle[]; maxSeverity: number; dominantStatus: ClinicalStatus }>();

  for (const muscle of abnormalMuscles) {
    const groupId = muscle.meshGroup;
    const existing = groupDysfunction.get(groupId);
    const severity = computeDysfunctionSeverity(muscle);

    if (!existing) {
      groupDysfunction.set(groupId, { muscles: [muscle], maxSeverity: severity, dominantStatus: muscle.clinicalStatus });
    } else {
      existing.muscles.push(muscle);
      if (severity > existing.maxSeverity) {
        existing.maxSeverity = severity;
        existing.dominantStatus = muscle.clinicalStatus;
      }
    }
  }

  const painRegionGroups = new Map<string, PainMarkerSimple[]>();
  for (const pm of painMarkers) {
    const groups = positionToRegionGroups(pm.position);
    for (const g of groups) {
      if (!painRegionGroups.has(g)) painRegionGroups.set(g, []);
      painRegionGroups.get(g)!.push(pm);
    }
  }

  const detectedSyndromes = muscleAnalysis.syndromes.filter(s => s.detected).map(s => s.label);
  const syndromeIds = muscleAnalysis.syndromes.filter(s => s.detected).map(s => s.id);

  for (const [groupId, data] of groupDysfunction) {
    const influenceEntry = influenceMap[groupId];
    const influencedByCount = influenceEntry?.sources?.length || 0;

    let influencesOutCount = 0;
    for (const [, entry] of Object.entries(influenceMap)) {
      if (entry.sources.some(s => s.sourceGroupId === groupId)) {
        influencesOutCount++;
      }
    }

    const isRootCause = influencesOutCount >= 2 && influencedByCount === 0;
    const isCompensation = influencedByCount > 0 && influencesOutCount === 0;

    const painCorrelations: PainCorrelation[] = [];
    const directPains = painRegionGroups.get(groupId) || [];
    for (const pm of directPains) {
      painCorrelations.push({
        painMarkerId: pm.id,
        painLabel: pm.label || 'Pain marker',
        mechanism: 'direct',
        explanation: `${getGroupLabel(groupId)} dysfunction directly at pain site`,
      });
    }

    if (influencesOutCount > 0) {
      for (const [targetGroup, entry] of Object.entries(influenceMap)) {
        const affectedPains = painRegionGroups.get(targetGroup) || [];
        if (affectedPains.length > 0 && entry.sources.some(s => s.sourceGroupId === groupId)) {
          const source = entry.sources.find(s => s.sourceGroupId === groupId)!;
          for (const pm of affectedPains) {
            painCorrelations.push({
              painMarkerId: pm.id,
              painLabel: pm.label || 'Pain marker',
              mechanism: source.pathway === 'fascial_chain' ? 'referred' : 'compensatory',
              explanation: `${getGroupLabel(groupId)} ${source.pathway === 'fascial_chain' ? 'tension propagating via ' + (source.chainName || 'fascial chain') : 'causing compensatory load'} → ${getGroupLabel(targetGroup)} pain`,
            });
          }
        }
      }
    }

    const chainContext: { chainName: string; integrity: number }[] = [];
    for (const [chainName, score] of Object.entries(chainIntegrityScores)) {
      if (isGroupInChain(groupId, chainName)) {
        chainContext.push({ chainName: formatChainName(chainName), integrity: score });
      }
    }

    const maxPainWeight = painCorrelations.reduce((max, pc) => {
      const marker = painMarkers.find(pm => pm.id === pc.painMarkerId);
      const w = marker?.weight ?? 1.0;
      return Math.max(max, w);
    }, 0);
    const painWeight = painCorrelations.length > 0 ? 2 * maxPainWeight : 0;
    const rootCauseWeight = isRootCause ? 3 : 0;
    const influenceWeight = Math.min(influencesOutCount * 0.5, 2);
    const severityWeight = data.maxSeverity / 25;
    const chainWeight = chainContext.some(c => c.integrity < 60) ? 1 : 0;
    const priority = Math.min(10, Math.round(painWeight + rootCauseWeight + influenceWeight + severityWeight + chainWeight));

    const { action, label } = STATUS_TO_ACTION[data.dominantStatus];
    const techniques = [...(TECHNIQUE_DB[data.dominantStatus] || [])].sort((a, b) => {
      const gradeOrder: Record<EvidenceGrade, number> = { A: 0, B: 1, C: 2, Expert: 3 };
      return gradeOrder[a.evidenceGrade] - gradeOrder[b.evidenceGrade];
    });

    const contraindications = checkContraindications(
      { groupId, dominantStatus: data.dominantStatus, muscles: data.muscles },
      groupDysfunction,
      painMarkers,
      chainIntegrityScores,
      detectedSyndromes
    );

    const rationale = buildRationale(data, influencesOutCount, influencedByCount, painCorrelations.length, isRootCause, isCompensation);

    targets.push({
      targetId: groupId,
      targetName: getGroupLabel(groupId),
      targetType: 'muscle',
      priority,
      clinicalStatus: data.dominantStatus,
      treatmentAction: action,
      actionLabel: label,
      isRootCause,
      isCompensation,
      rationale,
      techniques,
      painCorrelations,
      chainContext,
      influenceCount: influencesOutCount,
      dysfunctionScore: data.maxSeverity,
      contraindications,
    });
  }

  targets.sort((a, b) => {
    if (a.isRootCause && !b.isRootCause) return -1;
    if (!a.isRootCause && b.isRootCause) return 1;
    return b.priority - a.priority;
  });

  let criticalChain: string | null = null;
  let lowestIntegrity = 100;
  for (const [name, score] of Object.entries(chainIntegrityScores)) {
    if (score < lowestIntegrity) {
      lowestIntegrity = score;
      criticalChain = formatChainName(name);
    }
  }

  const syndromeProtocols: SyndromeProtocol[] = [];
  for (const sid of syndromeIds) {
    if (SYNDROME_PROTOCOLS[sid]) {
      syndromeProtocols.push(SYNDROME_PROTOCOLS[sid]);
    }
  }

  const treatmentSequence: string[] = [];
  const rootTargets = targets.filter(t => t.isRootCause);
  const compTargets = targets.filter(t => t.isCompensation);
  const otherTargets = targets.filter(t => !t.isRootCause && !t.isCompensation);

  if (rootTargets.length > 0) {
    treatmentSequence.push(`1. Address root causes: ${rootTargets.map(t => t.targetName).join(', ')}`);
  }
  if (otherTargets.length > 0) {
    treatmentSequence.push(`${rootTargets.length > 0 ? '2' : '1'}. Treat primary dysfunctions: ${otherTargets.map(t => t.targetName).join(', ')}`);
  }
  if (compTargets.length > 0) {
    treatmentSequence.push(`${rootTargets.length > 0 ? '3' : '2'}. Monitor compensations: ${compTargets.map(t => t.targetName).join(', ')}`);
  }

  return {
    targets,
    summary: {
      totalTargets: targets.length,
      rootCauses: rootTargets.length,
      compensations: compTargets.length,
      criticalChain: lowestIntegrity < 70 ? criticalChain : null,
      syndromes: detectedSyndromes,
      treatmentSequence,
      syndromeProtocols,
    }
  };
}

function computeDysfunctionSeverity(muscle: IndividualMuscle): number {
  let score = 0;
  if (muscle.clinicalStatus === 'shortened') score += 20 + (100 - muscle.lengthPercent) * 0.3;
  else if (muscle.clinicalStatus === 'lengthened') score += 15 + (muscle.lengthPercent - 100) * 0.2;
  else if (muscle.clinicalStatus === 'overactive') score += 25 + muscle.activationPercent * 0.3;
  else if (muscle.clinicalStatus === 'inhibited') score += 25 + muscle.inhibitionPercent * 0.4;
  else if (muscle.clinicalStatus === 'spasm') score += 35 + muscle.tightnessPercent * 0.3;
  else if (muscle.clinicalStatus === 'weak') score += 20 + (100 - muscle.activationPercent) * 0.2;
  return Math.min(100, score);
}

function getGroupLabel(groupId: string): string {
  const labels: Record<string, string> = {
    neck: 'Neck', chest: 'Chest', spine: 'Spine', core: 'Core',
    scapula_l: 'L Scapula', scapula_r: 'R Scapula',
    deltoid_l: 'L Shoulder', deltoid_r: 'R Shoulder',
    bicep_l: 'L Arm', bicep_r: 'R Arm',
    glute_l: 'L Glute', glute_r: 'R Glute',
    quad_l: 'L Thigh', quad_r: 'R Thigh',
    calf_l: 'L Calf', calf_r: 'R Calf',
    shin_l: 'L Shin', shin_r: 'R Shin',
  };
  return labels[groupId] || groupId;
}

function formatChainName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function isGroupInChain(groupId: string, chainName: string): boolean {
  const chainMuscleMap: Record<string, string[]> = {
    posterior_chain: ['glute_l', 'glute_r', 'spine', 'calf_l', 'calf_r', 'neck'],
    anterior_chain: ['quad_l', 'quad_r', 'core', 'chest', 'shin_l', 'shin_r', 'neck'],
    lateral_chain: ['deltoid_l', 'deltoid_r', 'glute_l', 'glute_r', 'calf_l', 'calf_r'],
    deep_longitudinal: ['spine', 'core', 'glute_l', 'glute_r', 'calf_l', 'calf_r'],
    spiral_chain: ['scapula_l', 'scapula_r', 'core', 'glute_l', 'glute_r', 'shin_l', 'shin_r'],
    arm_lines: ['deltoid_l', 'deltoid_r', 'scapula_l', 'scapula_r', 'bicep_l', 'bicep_r', 'chest'],
  };
  const groups = chainMuscleMap[chainName];
  return groups ? groups.includes(groupId) : false;
}

function buildRationale(
  data: { muscles: IndividualMuscle[]; maxSeverity: number; dominantStatus: ClinicalStatus },
  influencesOut: number,
  influencedBy: number,
  painCount: number,
  isRootCause: boolean,
  isCompensation: boolean
): string {
  const parts: string[] = [];
  const statusLabel = data.dominantStatus.charAt(0).toUpperCase() + data.dominantStatus.slice(1);

  if (isRootCause) {
    parts.push(`Root cause — ${statusLabel} with ${influencesOut} downstream effects`);
  } else if (isCompensation) {
    parts.push(`Compensation — ${statusLabel} due to ${influencedBy} upstream influence${influencedBy > 1 ? 's' : ''}`);
  } else {
    parts.push(`${statusLabel} dysfunction`);
    if (influencesOut > 0) parts.push(`affects ${influencesOut} other region${influencesOut > 1 ? 's' : ''}`);
  }

  if (painCount > 0) {
    parts.push(`linked to ${painCount} pain marker${painCount > 1 ? 's' : ''}`);
  }

  return parts.join('. ') + '.';
}

const MAITLAND_REF: EvidenceReference = { authors: 'Maitland GD, Hengeveld E, Banks K', year: 2013, title: 'Maitland\'s Vertebral Manipulation', journal: 'Elsevier' };
const MULLIGAN_REF: EvidenceReference = { authors: 'Mulligan BR', year: 2010, title: 'Manual Therapy: NAGS, SNAGS, MWMS etc.', journal: 'Plane View Services' };
const KALTENBORN_REF: EvidenceReference = { authors: 'Kaltenborn FM', year: 2011, title: 'Manual Mobilization of the Joints', journal: 'Norli' };
const BIALOSKY_REF: EvidenceReference = { authors: 'Bialosky JE, Bishop MD, Price DD', year: 2009, title: 'The mechanisms of manual therapy in the treatment of musculoskeletal pain', journal: 'Man Ther', pmid: '18983998' };

const BASE_MOBILIZATION_TECHNIQUES: TreatmentTechnique[] = [
  {
    name: 'Maitland Grade I-II oscillations',
    type: 'manual',
    dosage: '3-4 sets × 30s oscillations, within pain-free range',
    rationale: 'Low-grade oscillatory mobilizations for pain modulation via gate control and descending inhibition — appropriate for acute/irritable joints',
    evidenceGrade: 'A',
    references: [MAITLAND_REF, { authors: 'Gross A, Kay TM, Paquin JP et al', year: 2015, title: 'Exercises for mechanical neck disorders', journal: 'Cochrane Database Syst Rev', pmid: '25629215' }],
  },
  {
    name: 'Maitland Grade III-IV mobilization',
    type: 'manual',
    dosage: '3-5 sets × 30-60s, into resistance/end-range',
    rationale: 'Higher-grade mobilizations to restore accessory glide and joint play — targets capsular restriction and adhesion',
    evidenceGrade: 'A',
    references: [MAITLAND_REF, BIALOSKY_REF],
  },
  {
    name: 'Joint distraction / long-axis traction',
    type: 'manual',
    dosage: '3-4 × 15-30s sustained traction, grade II-III',
    rationale: 'Separates articular surfaces to reduce compression and improve synovial fluid circulation in loaded joints',
    evidenceGrade: 'B',
    references: [KALTENBORN_REF],
  },
];

interface JointMobilizationProfile {
  specificTechniques: TreatmentTechnique[];
  specificContraindications: Contraindication[];
}

const JOINT_SPECIFIC_PROFILES: Record<string, JointMobilizationProfile> = {
  cervical: {
    specificTechniques: [
      { name: 'Cervical PA glide (unilateral)', type: 'manual', dosage: 'Grade II-III, 3 × 30s per segment C2-C7', rationale: 'Posteroanterior pressure on articular pillars to restore facet joint glide — direction-specific for each segmental level', evidenceGrade: 'A', references: [MAITLAND_REF] },
      { name: 'Cervical SNAG (C2-C7)', type: 'manual', dosage: '3 × 6 reps sustained natural apophyseal glide with active ROM', rationale: 'Sustained vertebral glide during active cervical movement per Mulligan — restores pain-free motion through positional fault correction', evidenceGrade: 'B', references: [MULLIGAN_REF] },
      { name: 'Cervical lateral glide', type: 'manual', dosage: 'Grade II-III, 3 × 30s, contralateral to restriction', rationale: 'Transverse oscillation restoring lateral flexibility — especially effective for neural tension and radiculopathy symptoms', evidenceGrade: 'B', references: [MAITLAND_REF, BIALOSKY_REF] },
    ],
    specificContraindications: [
      { flag: 'Screen for vertebral artery insufficiency', severity: 'warning', reason: 'Pre-manipulative testing required for upper cervical mobilization. Assess for dizziness, nystagmus, diplopia. Avoid Grade V thrust techniques.' },
      { flag: 'Rule out upper cervical instability', severity: 'warning', reason: 'Sharp-Purser test and alar ligament stress tests recommended before C0-C2 mobilization, especially in RA patients or post-trauma.' },
    ],
  },
  thoracic: {
    specificTechniques: [
      { name: 'Thoracic PA glide (central & unilateral)', type: 'manual', dosage: 'Grade III-IV, 3-5 × 30-60s per segment', rationale: 'Central PA on spinous process restores extension; unilateral PA on transverse process restores rotation — both reduce thoracic hypomobility contributing to compensatory cervical/lumbar overload', evidenceGrade: 'A', references: [MAITLAND_REF] },
      { name: 'Thoracic SNAG (T1-T12)', type: 'manual', dosage: '3 × 6 reps sustained AP glide during active flexion/extension', rationale: 'Mulligan SNAG for thoracic segments during active movement — effective for restoring segmental mobility in stiff thoracic spine', evidenceGrade: 'B', references: [MULLIGAN_REF] },
      { name: 'Rib mobilization (AP/PA)', type: 'manual', dosage: 'Grade II-III, 3 × 30s on restricted rib angle', rationale: 'Accessory rib glide restoring costovertebral and costotransverse joint motion — addresses rib cage mobility restrictions contributing to breathing dysfunction', evidenceGrade: 'B', references: [KALTENBORN_REF] },
    ],
    specificContraindications: [
      { flag: 'Osteoporosis screening recommended', severity: 'caution', reason: 'Thoracic vertebrae are common osteoporotic fracture sites. Avoid high-grade PA mobilization in patients with known osteoporosis, prolonged steroid use, or post-menopausal women without bone density screening.' },
    ],
  },
  lumbar: {
    specificTechniques: [
      { name: 'Lumbar PA glide (central & unilateral)', type: 'manual', dosage: 'Grade III-IV, 3-5 × 30-60s per segment L1-L5', rationale: 'Central PA restores extension mobility; unilateral PA restores rotation — essential for reducing segmental hypomobility and disc-related stiffness', evidenceGrade: 'A', references: [MAITLAND_REF, BIALOSKY_REF] },
      { name: 'Lumbar rotation mobilization (sidelying)', type: 'manual', dosage: 'Grade III-IV, 3 × 30-60s, segmentally locked', rationale: 'Rotation mobilization with segmental locking above and below target — restores rotational mobility at specific motion segment', evidenceGrade: 'A', references: [MAITLAND_REF] },
      { name: 'Lumbar SNAG (L1-L5)', type: 'manual', dosage: '3 × 6 reps sustained glide during active flexion', rationale: 'Mulligan SNAG for lumbar flexion restriction — sustained AP glide on spinous process during forward flexion to restore pain-free movement', evidenceGrade: 'B', references: [MULLIGAN_REF] },
      { name: 'Lumbar traction (manual)', type: 'manual', dosage: '3-5 × 30-60s sustained or intermittent traction', rationale: 'Longitudinal traction to decompress disc and widen foramina — effective adjunct for discogenic and facetogenic pain', evidenceGrade: 'B', references: [KALTENBORN_REF] },
    ],
    specificContraindications: [
      { flag: 'Screen for cauda equina signs', severity: 'stop', reason: 'Bilateral leg symptoms, saddle anaesthesia, or bladder dysfunction require immediate referral — do not mobilize.' },
      { flag: 'Spondylolisthesis precaution', severity: 'caution', reason: 'If spondylolisthesis suspected, avoid extension-biased mobilization. Focus on flexion-based approaches and core stabilization.' },
    ],
  },
  shoulder: {
    specificTechniques: [
      { name: 'Glenohumeral AP/PA glide', type: 'manual', dosage: 'Grade II-IV, 3 × 30-60s, humeral head stabilized', rationale: 'AP glide for flexion/IR restriction (posterior capsule tightness); PA glide for extension/ER restriction — convex-on-concave rule for GH joint', evidenceGrade: 'A', references: [KALTENBORN_REF, MAITLAND_REF] },
      { name: 'Glenohumeral inferior glide', type: 'manual', dosage: 'Grade II-III, 3 × 30s in progressive abduction positions', rationale: 'Inferior glide of humeral head restores subacromial space and addresses capsular restriction limiting elevation — essential for frozen shoulder', evidenceGrade: 'A', references: [KALTENBORN_REF] },
      { name: 'Shoulder MWM (lateral glide)', type: 'manual', dosage: '3 × 10 reps lateral humeral glide during active elevation', rationale: 'Mulligan MWM correcting lateral translation of humeral head during arm elevation — immediate assessment of pain-free ROM gain', evidenceGrade: 'B', references: [MULLIGAN_REF, { authors: 'Vicenzino B, Paungmali A, Teys P', year: 2007, title: 'Mulligan\'s mobilization-with-movement, positional faults and pain relief', journal: 'J Bodyw Mov Ther', pmid: '19083664' }] },
    ],
    specificContraindications: [
      { flag: 'Hypermobility precaution', severity: 'caution', reason: 'Assess Beighton score before mobilization. Hypermobile shoulders need stabilization-focused approach — avoid end-range mobilization that may increase instability.' },
    ],
  },
  hip: {
    specificTechniques: [
      { name: 'Hip AP glide (supine)', type: 'manual', dosage: 'Grade III-IV, 3 × 30-60s, belt-assisted femoral AP mobilization', rationale: 'Anterior-posterior femoral glide restores hip extension and external rotation — concave-on-convex rule for acetabulofemoral joint', evidenceGrade: 'A', references: [KALTENBORN_REF] },
      { name: 'Hip lateral distraction', type: 'manual', dosage: 'Grade II-III, 3 × 30s sustained lateral traction with belt', rationale: 'Lateral distraction separates joint surfaces to reduce compression and improve capsular extensibility — useful for hip OA and impingement', evidenceGrade: 'B', references: [KALTENBORN_REF, MAITLAND_REF] },
      { name: 'Hip MWM (posterolateral glide)', type: 'manual', dosage: '3 × 10 reps posterior glide during active flexion/IR', rationale: 'Mulligan MWM with posterior-lateral femoral glide during hip flexion — addresses anterior impingement and restores pain-free flexion ROM', evidenceGrade: 'B', references: [MULLIGAN_REF] },
    ],
    specificContraindications: [
      { flag: 'Hip prosthesis precaution', severity: 'stop', reason: 'Post-total hip replacement — do not apply traction or end-range mobilization. Follow surgeon\'s specific ROM precautions.' },
      { flag: 'Inflammatory arthropathy', severity: 'caution', reason: 'Active inflammatory flare (hot, swollen joint) — use only Grade I-II for pain relief. Avoid end-range or forceful mobilization during acute inflammation.' },
    ],
  },
  knee: {
    specificTechniques: [
      { name: 'Tibiofemoral AP/PA glide', type: 'manual', dosage: 'Grade II-IV, 3 × 30-60s, proximal tibia mobilized on femur', rationale: 'AP tibial glide restores knee extension; PA glide restores flexion — fundamental accessory motion for knee joint play', evidenceGrade: 'A', references: [MAITLAND_REF, KALTENBORN_REF] },
      { name: 'Patellofemoral mobilization (medial/lateral/superior/inferior)', type: 'manual', dosage: 'Grade II-III, 3 × 30s per direction of restriction', rationale: 'Patellar glide in restricted direction restores patellofemoral tracking — addresses anterior knee pain and quad inhibition from patellar hypomobility', evidenceGrade: 'A', references: [MAITLAND_REF] },
      { name: 'Knee MWM (tibial rotation)', type: 'manual', dosage: '3 × 10 reps tibial IR/ER glide during active flexion/extension', rationale: 'Mulligan MWM correcting rotational positional fault of tibia — effective for meniscal and ligamentous pain patterns', evidenceGrade: 'B', references: [MULLIGAN_REF] },
    ],
    specificContraindications: [
      { flag: 'Ligament integrity check', severity: 'caution', reason: 'If ACL/PCL/collateral ligament laxity present, avoid translational mobilization in the direction of instability. Focus on stabilization instead.' },
    ],
  },
  ankle: {
    specificTechniques: [
      { name: 'Talocrural AP glide (weight-bearing)', type: 'manual', dosage: 'Grade III-IV, 3 × 30-60s posterior talar glide with dorsiflexion', rationale: 'Posterior talar glide during weight-bearing dorsiflexion restores talocrural mobility — critical for squat depth and gait mechanics', evidenceGrade: 'A', references: [MAITLAND_REF, { authors: 'Denegar CR, Hertel J, Fonseca J', year: 2002, title: 'The effect of lateral ankle sprain on dorsiflexion range of motion, posterior talar glide, and joint laxity', journal: 'J Orthop Sports Phys Ther', pmid: '12164401' }] },
      { name: 'Subtalar medial/lateral glide', type: 'manual', dosage: 'Grade II-III, 3 × 30s per direction', rationale: 'Subtalar glides restore inversion/eversion accessory motion — addresses post-sprain stiffness and compensatory gait patterns', evidenceGrade: 'B', references: [KALTENBORN_REF] },
      { name: 'Ankle MWM (AP talar glide)', type: 'manual', dosage: '3 × 10 reps AP glide with belt during active dorsiflexion', rationale: 'Mulligan MWM for ankle dorsiflexion restriction — belt-assisted posterior talar glide during weight-bearing lunge', evidenceGrade: 'B', references: [MULLIGAN_REF] },
    ],
    specificContraindications: [],
  },
  elbow: {
    specificTechniques: [
      { name: 'Humero-ulnar distraction', type: 'manual', dosage: 'Grade II-III, 3 × 30s long-axis traction', rationale: 'Long-axis traction separates humero-ulnar joint surfaces — decompresses and restores flexion/extension mobility', evidenceGrade: 'B', references: [KALTENBORN_REF] },
      { name: 'Lateral elbow MWM (lateral glide)', type: 'manual', dosage: '3 × 10 reps lateral glide during pain-free gripping', rationale: 'Mulligan MWM with sustained lateral glide of ulna on humerus during gripping — specific technique for lateral epicondylalgia (tennis elbow)', evidenceGrade: 'A', references: [MULLIGAN_REF, { authors: 'Vicenzino B', year: 2003, title: 'Lateral epicondylalgia: a musculoskeletal physiotherapy perspective', journal: 'Man Ther', pmid: '12890436' }] },
      { name: 'Radio-ulnar AP/PA glide', type: 'manual', dosage: 'Grade II-III, 3 × 30s for proximal and distal radioulnar joints', rationale: 'Accessory radioulnar glides restore pronation/supination — addresses forearm rotation restrictions', evidenceGrade: 'B', references: [KALTENBORN_REF] },
    ],
    specificContraindications: [],
  },
  wrist: {
    specificTechniques: [
      { name: 'Radiocarpal AP/PA glide', type: 'manual', dosage: 'Grade II-III, 3 × 30s, carpal row mobilized on radius', rationale: 'Dorsal/palmar carpal glides restoring wrist flexion/extension accessory motion — addresses post-fracture/cast stiffness', evidenceGrade: 'B', references: [KALTENBORN_REF] },
      { name: 'Intercarpal mobilization', type: 'manual', dosage: 'Grade II-III, 3 × 20-30s per restricted intercarpal joint', rationale: 'Individual carpal bone mobilization restoring intracarpal kinematics — important for scaphoid-lunate and lunate-triquetral mechanics', evidenceGrade: 'B', references: [KALTENBORN_REF] },
    ],
    specificContraindications: [],
  },
};

function classifyJointRegion(jointId: string, jointLabel: string): string {
  const combined = `${jointId}_${jointLabel}`.toLowerCase();
  if (combined.includes('cervic') || combined.includes('c1') || combined.includes('c2') || combined.includes('c3') || combined.includes('c4') || combined.includes('c5') || combined.includes('c6') || combined.includes('c7') || combined.includes('neck')) return 'cervical';
  if (combined.includes('thorac') || combined.includes('t1') || combined.includes('t12') || combined.includes('rib')) return 'thoracic';
  if (combined.includes('lumbar') || combined.includes('l1') || combined.includes('l2') || combined.includes('l3') || combined.includes('l4') || combined.includes('l5') || combined.includes('sacr') || combined.includes('si_')) return 'lumbar';
  if (combined.includes('shoulder') || combined.includes('glenohumeral') || combined.includes('gh_') || combined.includes('acromioclavicular')) return 'shoulder';
  if (combined.includes('hip') || combined.includes('acetabul') || combined.includes('femoral')) return 'hip';
  if (combined.includes('knee') || combined.includes('tibiofe') || combined.includes('patello')) return 'knee';
  if (combined.includes('ankle') || combined.includes('talocrural') || combined.includes('subtalar')) return 'ankle';
  if (combined.includes('elbow') || combined.includes('humeroulnar') || combined.includes('radioulnar')) return 'elbow';
  if (combined.includes('wrist') || combined.includes('radiocarpal') || combined.includes('carpal')) return 'wrist';
  return '';
}

export function computeJointMobilizationTargets(forceAnalysis: ForceAnalysisResult): TreatmentTarget[] {
  const targets: TreatmentTarget[] = [];
  const elevatedJoints = forceAnalysis.joints.filter(
    j => j.status === 'high' || j.status === 'very_high'
  );

  for (const joint of elevatedJoints) {
    const isVeryHigh = joint.status === 'very_high';
    const severity = isVeryHigh ? 85 : 60;
    const priority = isVeryHigh ? 8 : 6;

    const region = classifyJointRegion(joint.id, joint.label);
    const profile = JOINT_SPECIFIC_PROFILES[region];

    let techniques: TreatmentTechnique[];
    if (profile) {
      if (isVeryHigh) {
        techniques = [BASE_MOBILIZATION_TECHNIQUES[0], ...profile.specificTechniques.slice(0, 2)];
      } else {
        techniques = [...profile.specificTechniques, ...BASE_MOBILIZATION_TECHNIQUES];
      }
    } else {
      techniques = isVeryHigh ? BASE_MOBILIZATION_TECHNIQUES.slice(0, 2) : BASE_MOBILIZATION_TECHNIQUES;
    }

    const contraindications: Contraindication[] = [];

    if (isVeryHigh) {
      contraindications.push({
        flag: 'Very high joint loading',
        severity: 'warning',
        reason: `Joint force at ${joint.totalForce.toFixed(0)}% BW — use Grade I-II initially. Avoid Grade IV thrust techniques until loading is reduced through postural correction.`,
      });
    }
    if (joint.shear > joint.compression * 0.4) {
      contraindications.push({
        flag: 'Elevated shear component',
        severity: 'caution',
        reason: 'Shear force exceeds 40% of compression — suggests segmental instability. Prioritize stabilization exercises alongside mobilization. Avoid translational mobilization in shear direction.',
      });
    }
    if (joint.tension > joint.compression * 0.5) {
      contraindications.push({
        flag: 'Elevated tensile loading',
        severity: 'caution',
        reason: 'High tensile component may indicate ligamentous strain. Assess joint stability before end-range mobilization — consider Beighton score for generalized hypermobility.',
      });
    }
    if (profile) {
      contraindications.push(...profile.specificContraindications);
    }

    const regionLabel = region ? ` (${region} region)` : '';

    targets.push({
      targetId: `joint_${joint.id}`,
      targetName: joint.label,
      targetType: 'joint',
      priority,
      clinicalStatus: 'overactive' as ClinicalStatus,
      treatmentAction: 'mobilize',
      actionLabel: isVeryHigh ? 'Mobilize (Graded)' : 'Joint Mobilization',
      isRootCause: false,
      isCompensation: false,
      rationale: `${joint.label}${regionLabel} under ${isVeryHigh ? 'very high' : 'high'} loading (${joint.totalForce.toFixed(0)}% BW). ${joint.clinical}. Joint mobilization indicated to restore accessory motion, reduce compressive symptoms, and normalize joint mechanics.`,
      techniques,
      painCorrelations: [],
      chainContext: [],
      influenceCount: 0,
      dysfunctionScore: severity,
      contraindications,
    });
  }

  return targets;
}
