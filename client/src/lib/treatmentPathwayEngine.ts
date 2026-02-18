import type { CrossSystemCorrelationResult, PainCorrelation, CompensationPattern } from './crossSystemCorrelation';
import type { IndividualMuscle, MuscleGroupAnalysis } from './muscleBiomechanicsEngine';
import type { JointSurfaceForce } from './posturalForceEngine';

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'Expert';
export type TreatmentPhase = 'acute' | 'subacute' | 'maintenance';

export interface EvidenceReference {
  authors: string;
  year: number;
  title: string;
  journal: string;
  grade: EvidenceGrade;
}

export interface ManualTherapyTechnique {
  name: string;
  targetTissue: string;
  description: string;
  dosage: string;
  grade: EvidenceGrade;
  evidence: EvidenceReference;
  contraindications: string[];
  phase: TreatmentPhase;
  rationale: string;
}

export interface ExercisePrescription {
  name: string;
  targetMuscle: string;
  muscleIssue: string;
  type: 'stretch' | 'activation' | 'strengthening' | 'stabilization' | 'mobility' | 'neuromuscular';
  sets: string;
  reps: string;
  hold: string;
  frequency: string;
  progression: string;
  grade: EvidenceGrade;
  evidence: EvidenceReference;
  phase: TreatmentPhase;
  rationale: string;
}

export interface RecoveryMilestone {
  week: number;
  phase: TreatmentPhase;
  title: string;
  criteria: string[];
  expectedOutcomes: string[];
}

export interface PhaseBlock {
  phase: TreatmentPhase;
  label: string;
  timeframe: string;
  goals: string[];
  manualTherapy: ManualTherapyTechnique[];
  exercises: ExercisePrescription[];
  milestones: RecoveryMilestone[];
  precautions: string[];
}

export interface ClinicalReasoning {
  summary: string;
  primaryDiagnosis: string;
  differentials: string[];
  keyFindings: { finding: string; significance: string; source: string }[];
  mechanismOfInjury: string;
  prognosticFactors: { factor: string; impact: 'positive' | 'negative' | 'neutral' }[];
}

export interface TreatmentPlan {
  clinicalReasoning: ClinicalReasoning;
  phases: PhaseBlock[];
  overallTimeline: string;
  redFlags: string[];
  outcomesMeasures: string[];
}

export interface TreatmentInput {
  correlationResult: CrossSystemCorrelationResult | null;
  muscles: IndividualMuscle[];
  forces: JointSurfaceForce[];
  painMarkers: { id: string; label: string; severity: number; region: string; type: string }[];
  chainIntegrityScores: Map<string, { score: number; issues: string[]; problematicLinks: string[]; exercises: string[] }>;
  bodyWeightKg: number;
}

const EVIDENCE_DB: Record<string, EvidenceReference[]> = {
  cervical_mobilisation: [
    { authors: 'Jull G, Trott P, Potter H, et al.', year: 2002, title: 'A randomized controlled trial of exercise and manipulative therapy for cervicogenic headache', journal: 'Spine', grade: 'A' },
    { authors: 'Gross A, Kay TM, Paquin JP, et al.', year: 2015, title: 'Exercises for mechanical neck disorders', journal: 'Cochrane Database Syst Rev', grade: 'A' },
  ],
  cervical_exercise: [
    { authors: 'O\'Leary S, Falla D, Elliott JM, Jull G', year: 2009, title: 'Muscle dysfunction in cervical spine pain: implications for assessment and management', journal: 'J Orthop Sports Phys Ther', grade: 'B' },
  ],
  shoulder_mobilisation: [
    { authors: 'Teys P, Bisset L, Vicenzino B', year: 2008, title: 'The initial effects of a Mulligan mobilisation with movement technique on range of movement and pressure pain threshold in pain-limited shoulders', journal: 'Man Ther', grade: 'B' },
    { authors: 'Maitland GD, Hengeveld E, Banks K, English K', year: 2005, title: 'Maitland\'s Vertebral Manipulation', journal: 'Elsevier', grade: 'B' },
  ],
  shoulder_exercise: [
    { authors: 'Cools AM, Dewitte V, Lanszweert F, et al.', year: 2007, title: 'Rehabilitation of scapular muscle balance', journal: 'Am J Sports Med', grade: 'A' },
    { authors: 'Kuhn JE', year: 2009, title: 'Exercise in the treatment of rotator cuff impingement: a systematic review and a synthesized evidence-based rehabilitation protocol', journal: 'J Shoulder Elbow Surg', grade: 'A' },
  ],
  lumbar_mobilisation: [
    { authors: 'Rubinstein SM, de Zoete A, van Middelkoop M, et al.', year: 2019, title: 'Benefits and harms of spinal manipulative therapy for the treatment of chronic low back pain', journal: 'BMJ', grade: 'A' },
    { authors: 'Delitto A, George SZ, Van Dillen LR, et al.', year: 2012, title: 'Low back pain clinical practice guidelines', journal: 'J Orthop Sports Phys Ther', grade: 'A' },
  ],
  lumbar_exercise: [
    { authors: 'Hayden JA, van Tulder MW, Malmivaara A, Koes BW', year: 2005, title: 'Exercise therapy for treatment of non-specific low back pain', journal: 'Cochrane Database Syst Rev', grade: 'A' },
    { authors: 'McGill SM', year: 2007, title: 'Low Back Disorders: Evidence-Based Prevention and Rehabilitation', journal: 'Human Kinetics', grade: 'B' },
  ],
  core_stability: [
    { authors: 'Hodges PW, Richardson CA', year: 1996, title: 'Inefficient muscular stabilization of the lumbar spine associated with low back pain', journal: 'Spine', grade: 'A' },
    { authors: 'Hides JA, Jull GA, Richardson CA', year: 2001, title: 'Long-term effects of specific stabilizing exercises for first-episode low back pain', journal: 'Spine', grade: 'A' },
  ],
  hip_mobilisation: [
    { authors: 'Bennell KL, Egerton T, Martin J, et al.', year: 2014, title: 'Effect of physical therapy on pain and function in patients with hip osteoarthritis', journal: 'JAMA', grade: 'A' },
  ],
  hip_exercise: [
    { authors: 'Reiman MP, Bolgla LA, Loudon JK', year: 2012, title: 'A literature review of studies evaluating gluteus maximus and gluteus medius activation during rehabilitation exercises', journal: 'Physiother Theory Pract', grade: 'B' },
    { authors: 'Distefano LJ, Blackburn JT, Marshall SW, Padua DA', year: 2009, title: 'Gluteal muscle activation during common therapeutic exercises', journal: 'J Orthop Sports Phys Ther', grade: 'B' },
  ],
  knee_exercise: [
    { authors: 'Fransen M, McConnell S, Harmer AR, et al.', year: 2015, title: 'Exercise for osteoarthritis of the knee', journal: 'Cochrane Database Syst Rev', grade: 'A' },
    { authors: 'Powers CM', year: 2010, title: 'The influence of abnormal hip mechanics on knee injury: a biomechanical perspective', journal: 'J Orthop Sports Phys Ther', grade: 'B' },
  ],
  ankle_exercise: [
    { authors: 'Bleakley CM, O\'Connor SR, Tully MA, et al.', year: 2010, title: 'Effect of accelerated rehabilitation on function after ankle sprain', journal: 'BMJ', grade: 'A' },
  ],
  thoracic_mobilisation: [
    { authors: 'Cleland JA, Childs JD, McRae M, et al.', year: 2005, title: 'Immediate effects of thoracic manipulation in patients with neck pain', journal: 'Man Ther', grade: 'B' },
  ],
  myofascial_release: [
    { authors: 'Ajimsha MS, Al-Mudahka NR, Al-Madzhar JA', year: 2015, title: 'Effectiveness of myofascial release: systematic review of randomized controlled trials', journal: 'J Bodyw Mov Ther', grade: 'B' },
  ],
  trigger_point: [
    { authors: 'Simons DG, Travell JG, Simons LS', year: 1999, title: 'Travell & Simons\' Myofascial Pain and Dysfunction: The Trigger Point Manual', journal: 'Williams & Wilkins', grade: 'B' },
  ],
  neurodynamics: [
    { authors: 'Butler DS', year: 2000, title: 'The Sensitive Nervous System', journal: 'NOIgroup Publications', grade: 'B' },
    { authors: 'Basson A, Olivier B, Ellis R, et al.', year: 2017, title: 'The effectiveness of neural mobilization for neuromusculoskeletal conditions', journal: 'J Orthop Sports Phys Ther', grade: 'B' },
  ],
  stretching: [
    { authors: 'Page P', year: 2012, title: 'Current concepts in muscle stretching for exercise and rehabilitation', journal: 'Int J Sports Phys Ther', grade: 'B' },
  ],
  eccentric: [
    { authors: 'Alfredson H, Pietilä T, Jonsson P, Lorentzon R', year: 1998, title: 'Heavy-load eccentric calf muscle training for the treatment of chronic Achilles tendinosis', journal: 'Am J Sports Med', grade: 'A' },
  ],
  upper_cross: [
    { authors: 'Janda V', year: 1996, title: 'Evaluation of muscular imbalance', journal: 'Rehabilitation of the Spine', grade: 'B' },
    { authors: 'Page P, Frank CC, Lardner R', year: 2010, title: 'Assessment and Treatment of Muscle Imbalance: The Janda Approach', journal: 'Human Kinetics', grade: 'B' },
  ],
  lower_cross: [
    { authors: 'Janda V', year: 1996, title: 'Evaluation of muscular imbalance', journal: 'Rehabilitation of the Spine', grade: 'B' },
  ],
  postural_correction: [
    { authors: 'Kendall FP, McCreary EK, Provance PG', year: 2005, title: 'Muscles: Testing and Function with Posture and Pain', journal: 'Lippincott Williams & Wilkins', grade: 'B' },
  ],
};

const REGION_MANUAL_THERAPY: Record<string, ManualTherapyTechnique[]> = {
  cervical: [
    { name: 'Cervical lateral glide (C5-6)', targetTissue: 'Cervical zygapophyseal joints', description: 'Unilateral PA glide at the symptomatic level with the patient supine. Apply a sustained lateral glide to the spinous process.', dosage: '3-5 sets × 30s sustained or 3 × 10 oscillations Grade III', grade: 'A', evidence: EVIDENCE_DB.cervical_mobilisation[0], contraindications: ['Vertebral artery insufficiency', 'Upper cervical instability', 'Acute inflammatory arthritis'], phase: 'acute', rationale: '' },
    { name: 'Deep neck flexor retraining', targetTissue: 'Longus colli, longus capitis', description: 'Craniocervical flexion test with pressure biofeedback unit. Progressive loading from 22-30 mmHg.', dosage: '10 × 10s holds at target pressure, 2-3×/day', grade: 'A', evidence: EVIDENCE_DB.cervical_exercise[0], contraindications: ['Acute whiplash (<72h)'], phase: 'acute', rationale: '' },
    { name: 'Upper cervical SNAG (C1-2)', targetTissue: 'Atlanto-axial joint', description: 'Mulligan sustained natural apophyseal glide at C1-2 for rotation restriction. Apply during active rotation.', dosage: '3-6 repetitions, reassess ROM between sets', grade: 'B', evidence: EVIDENCE_DB.shoulder_mobilisation[0], contraindications: ['Dens fracture', 'Rheumatoid arthritis with cervical involvement', 'VBI signs'], phase: 'subacute', rationale: '' },
    { name: 'Suboccipital release', targetTissue: 'Rectus capitis posterior, obliquus capitis', description: 'Sustained pressure technique to the suboccipital muscle group with patient supine. Hold until tissue release is felt.', dosage: '3-5 minutes sustained hold', grade: 'B', evidence: EVIDENCE_DB.myofascial_release[0], contraindications: ['Acute cervical trauma'], phase: 'acute', rationale: '' },
  ],
  shoulder: [
    { name: 'Glenohumeral posterior glide (Grade III-IV)', targetTissue: 'Posterior glenohumeral capsule', description: 'With patient supine, arm in 90° flexion. Apply posterior-directed force to the humeral head to restore normal arthrokinematics.', dosage: '3-5 sets × 30-60s sustained or 3 × 10 oscillations', grade: 'B', evidence: EVIDENCE_DB.shoulder_mobilisation[1], contraindications: ['Posterior instability', 'Acute fracture', 'Joint infection'], phase: 'subacute', rationale: '' },
    { name: 'Mulligan MWM for shoulder elevation', targetTissue: 'Glenohumeral joint', description: 'Sustained posterolateral glide of the humeral head during active shoulder flexion/abduction. Pain-free movement should be immediate.', dosage: '3 × 10 reps with sustained glide, reassess', grade: 'B', evidence: EVIDENCE_DB.shoulder_mobilisation[0], contraindications: ['Full-thickness rotator cuff tear', 'Acute dislocation'], phase: 'acute', rationale: '' },
    { name: 'Scapulothoracic mobilisation', targetTissue: 'Scapulothoracic articulation, periscapular muscles', description: 'Side-lying scapular mobilisation including distraction, protraction/retraction, and rotation to restore scapulothoracic mobility.', dosage: '3-5 minutes, combined with active retraining', grade: 'B', evidence: EVIDENCE_DB.shoulder_exercise[0], contraindications: ['Rib fracture', 'Post-surgical <6 weeks'], phase: 'acute', rationale: '' },
    { name: 'Pectoralis minor soft tissue release', targetTissue: 'Pectoralis minor, anterior chest wall fascia', description: 'Direct sustained pressure to pectoralis minor at the coracoid process attachment. Combine with passive lengthening.', dosage: '3 × 60-90s holds with progressive stretch', grade: 'B', evidence: EVIDENCE_DB.myofascial_release[0], contraindications: ['Breast surgery <8 weeks', 'Thoracic outlet syndrome - vascular type'], phase: 'acute', rationale: '' },
  ],
  lumbar: [
    { name: 'Lumbar PA mobilisation (Grade III-IV)', targetTissue: 'Lumbar zygapophyseal joints, segmental mobility', description: 'Central or unilateral posteroanterior pressure applied to the spinous process of the symptomatic level. Progress from Grade II to III-IV based on response.', dosage: '3-5 sets × 30s oscillatory or sustained', grade: 'A', evidence: EVIDENCE_DB.lumbar_mobilisation[0], contraindications: ['Cauda equina syndrome', 'Spinal fracture', 'Malignancy', 'Active inflammatory spondyloarthropathy'], phase: 'subacute', rationale: '' },
    { name: 'Lumbar rotation mobilisation', targetTissue: 'Lumbar facet joints, multifidus, rotators', description: 'Side-lying lumbar rotation mobilisation targeting the stiff segment. Palpate intersegmental motion during oscillations.', dosage: '3-4 sets × 10 oscillations Grade III', grade: 'A', evidence: EVIDENCE_DB.lumbar_mobilisation[1], contraindications: ['Acute disc herniation with radiculopathy', 'Spondylolisthesis Grade II+'], phase: 'subacute', rationale: '' },
    { name: 'Psoas release technique', targetTissue: 'Psoas major, iliacus', description: 'Supine positional release or direct sustained pressure to the psoas muscle lateral to the rectus abdominis. Patient may feel deep referral to the lumbar spine.', dosage: '3-5 × 60-90s holds', grade: 'B', evidence: EVIDENCE_DB.trigger_point[0], contraindications: ['Abdominal aortic aneurysm', 'Pregnancy'], phase: 'acute', rationale: '' },
    { name: 'Thoracolumbar junction mobilisation', targetTissue: 'T12-L1 facet joints', description: 'PA mobilisation targeting the thoracolumbar junction, which commonly refers pain to the lower back and gluteal region.', dosage: '3 sets × 30s Grade III oscillations', grade: 'B', evidence: EVIDENCE_DB.thoracic_mobilisation[0], contraindications: ['Osteoporotic fracture'], phase: 'subacute', rationale: '' },
  ],
  thoracic: [
    { name: 'Thoracic PA mobilisation', targetTissue: 'Thoracic zygapophyseal joints, costovertebral joints', description: 'Central PA pressure to thoracic spinous processes. Can be combined with breathing to modulate force.', dosage: '3-5 sets × 30s Grade III-IV oscillations', grade: 'B', evidence: EVIDENCE_DB.thoracic_mobilisation[0], contraindications: ['Osteoporosis', 'Thoracic fracture'], phase: 'subacute', rationale: '' },
    { name: 'Rib mobilisation', targetTissue: 'Costovertebral and costotransverse joints', description: 'PA pressure over the rib angle or anterolateral pressure for rib elevation/depression dysfunction.', dosage: '3 × 10 oscillations Grade III, coordinate with breathing', grade: 'B', evidence: EVIDENCE_DB.thoracic_mobilisation[0], contraindications: ['Rib fracture', 'Pneumothorax'], phase: 'subacute', rationale: '' },
  ],
  hip: [
    { name: 'Hip long axis distraction (Grade III)', targetTissue: 'Hip joint capsule, labrum', description: 'With patient supine, hip in neutral. Apply longitudinal distraction force along the femoral axis to decompress the joint.', dosage: '3-5 × 15-30s sustained holds', grade: 'A', evidence: EVIDENCE_DB.hip_mobilisation[0], contraindications: ['Acute fracture', 'Joint replacement <6 weeks', 'Severe osteoporosis'], phase: 'subacute', rationale: '' },
    { name: 'Hip lateral glide with belt', targetTissue: 'Hip joint capsule — lateral compartment', description: 'Mobilisation with movement using belt for lateral glide of the femoral head during flexion/IR. Restores normal femoral head kinematics.', dosage: '3 × 10 repetitions with belt, assess squat/flexion', grade: 'B', evidence: EVIDENCE_DB.hip_mobilisation[0], contraindications: ['Acute labral tear', 'Joint infection'], phase: 'subacute', rationale: '' },
    { name: 'Gluteal trigger point release', targetTissue: 'Gluteus medius, piriformis, deep rotators', description: 'Direct sustained pressure or dry needling to active trigger points in the gluteal muscles. Piriformis TrPs may refer to the posterior thigh.', dosage: '60-90s per trigger point, 3-5 points per session', grade: 'B', evidence: EVIDENCE_DB.trigger_point[0], contraindications: ['Anticoagulant therapy (dry needling)', 'Local infection'], phase: 'acute', rationale: '' },
  ],
  knee: [
    { name: 'Patellofemoral mobilisation', targetTissue: 'Patellofemoral joint, lateral retinaculum', description: 'Medial, lateral, superior, and inferior patellar glides to restore normal patellar tracking. Focus on restricted directions.', dosage: '3 × 10 glides in each restricted direction', grade: 'B', evidence: EVIDENCE_DB.knee_exercise[0], contraindications: ['Patellar fracture', 'Post-surgical <4 weeks'], phase: 'subacute', rationale: '' },
    { name: 'Tibiofemoral AP mobilisation', targetTissue: 'Tibiofemoral joint, cruciate ligaments', description: 'Anterior or posterior tibial glide to restore knee flexion/extension. Grade III-IV for stiffness.', dosage: '3-5 × 30s oscillations', grade: 'B', evidence: EVIDENCE_DB.knee_exercise[0], contraindications: ['ACL reconstruction <12 weeks (anterior glide)', 'PCL injury (posterior glide)'], phase: 'subacute', rationale: '' },
  ],
  ankle: [
    { name: 'Talocrural AP mobilisation (Grade III-IV)', targetTissue: 'Talocrural joint, anterior capsule', description: 'Weight-bearing or non-weight-bearing posterior talar glide to restore ankle dorsiflexion. Commonly restricted after ankle sprain.', dosage: '3 × 10 oscillations or 3 × 30s sustained', grade: 'A', evidence: EVIDENCE_DB.ankle_exercise[0], contraindications: ['Acute fracture', 'Posterior impingement'], phase: 'subacute', rationale: '' },
  ],
};

const MUSCLE_EXERCISE_DB: Record<string, { shortened: ExercisePrescription[]; inhibited: ExercisePrescription[]; overactive: ExercisePrescription[]; weak: ExercisePrescription[]; spasm: ExercisePrescription[] }> = {
  upper_trapezius: {
    shortened: [{ name: 'Upper trapezius stretch', targetMuscle: 'Upper Trapezius', muscleIssue: 'shortened', type: 'stretch', sets: '3', reps: '1', hold: '30s', frequency: '2-3×/day', progression: 'Add lateral flexion overpressure at week 2', grade: 'B', evidence: EVIDENCE_DB.stretching[0], phase: 'acute', rationale: '' }],
    inhibited: [],
    overactive: [{ name: 'Upper trapezius eccentric lowering', targetMuscle: 'Upper Trapezius', muscleIssue: 'overactive', type: 'neuromuscular', sets: '3', reps: '10', hold: '5s eccentric', frequency: 'Daily', progression: 'Add resistance band at week 3', grade: 'B', evidence: EVIDENCE_DB.upper_cross[0], phase: 'subacute', rationale: '' }],
    weak: [],
    spasm: [{ name: 'Gentle upper trapezius stretch with heat', targetMuscle: 'Upper Trapezius', muscleIssue: 'spasm', type: 'stretch', sets: '3', reps: '1', hold: '20s', frequency: '3-4×/day', progression: 'Progress to sustained holds without heat at week 2', grade: 'B', evidence: EVIDENCE_DB.stretching[0], phase: 'acute', rationale: '' }],
  },
  levator_scapulae: {
    shortened: [{ name: 'Levator scapulae corner stretch', targetMuscle: 'Levator Scapulae', muscleIssue: 'shortened', type: 'stretch', sets: '3', reps: '1', hold: '30s each side', frequency: '2-3×/day', progression: 'Add scapular depression during stretch', grade: 'B', evidence: EVIDENCE_DB.stretching[0], phase: 'acute', rationale: '' }],
    inhibited: [],
    overactive: [{ name: 'Scapular depression with dowel', targetMuscle: 'Levator Scapulae', muscleIssue: 'overactive', type: 'neuromuscular', sets: '3', reps: '12', hold: '3s', frequency: 'Daily', progression: 'Progress to prone Y-raise', grade: 'B', evidence: EVIDENCE_DB.shoulder_exercise[0], phase: 'subacute', rationale: '' }],
    weak: [],
    spasm: [{ name: 'Positional release — levator scapulae', targetMuscle: 'Levator Scapulae', muscleIssue: 'spasm', type: 'stretch', sets: '3', reps: '1', hold: '90s', frequency: '2×/day', progression: 'Transition to active stretching at week 2', grade: 'B', evidence: EVIDENCE_DB.trigger_point[0], phase: 'acute', rationale: '' }],
  },
  pectoralis: {
    shortened: [{ name: 'Doorway pectoral stretch', targetMuscle: 'Pectoralis Major/Minor', muscleIssue: 'shortened', type: 'stretch', sets: '3', reps: '1', hold: '30s at 90° and 120°', frequency: '2-3×/day', progression: 'Add foam roller pec stretch at week 3', grade: 'B', evidence: EVIDENCE_DB.stretching[0], phase: 'acute', rationale: '' }],
    inhibited: [],
    overactive: [{ name: 'Scapular retraction emphasis during rows', targetMuscle: 'Pectoralis Major/Minor', muscleIssue: 'overactive', type: 'neuromuscular', sets: '3', reps: '12', hold: '3s retraction hold', frequency: '3×/week', progression: 'Progress to single-arm cable rows', grade: 'B', evidence: EVIDENCE_DB.shoulder_exercise[0], phase: 'subacute', rationale: '' }],
    weak: [],
    spasm: [{ name: 'Pectoral soft tissue release + gentle stretch', targetMuscle: 'Pectoralis Major/Minor', muscleIssue: 'spasm', type: 'stretch', sets: '3', reps: '1', hold: '60s', frequency: '2×/day', progression: 'Active doorway stretch at week 2', grade: 'B', evidence: EVIDENCE_DB.myofascial_release[0], phase: 'acute', rationale: '' }],
  },
  deep_neck_flexors: {
    shortened: [],
    inhibited: [{ name: 'Craniocervical flexion training (pressure biofeedback)', targetMuscle: 'Deep Neck Flexors', muscleIssue: 'inhibited', type: 'activation', sets: '3', reps: '10', hold: '10s', frequency: '2×/day', progression: 'Increase target pressure 2mmHg/week from 22 to 30', grade: 'A', evidence: EVIDENCE_DB.cervical_exercise[0], phase: 'acute', rationale: '' }],
    overactive: [],
    weak: [{ name: 'Supine chin tuck with head lift', targetMuscle: 'Deep Neck Flexors', muscleIssue: 'weak', type: 'strengthening', sets: '3', reps: '8-12', hold: '5s', frequency: 'Daily', progression: 'Progress to seated chin tuck against resistance band', grade: 'A', evidence: EVIDENCE_DB.cervical_exercise[0], phase: 'subacute', rationale: '' }],
    spasm: [],
  },
  lower_trapezius: {
    shortened: [],
    inhibited: [{ name: 'Prone Y-raise (lower trapezius activation)', targetMuscle: 'Lower Trapezius', muscleIssue: 'inhibited', type: 'activation', sets: '3', reps: '10', hold: '5s', frequency: 'Daily', progression: 'Add light weight (0.5-1kg) at week 3, progress to incline Y-raise', grade: 'A', evidence: EVIDENCE_DB.shoulder_exercise[0], phase: 'acute', rationale: '' }],
    overactive: [],
    weak: [{ name: 'Wall slide with scapular depression', targetMuscle: 'Lower Trapezius', muscleIssue: 'weak', type: 'strengthening', sets: '3', reps: '12', hold: '3s', frequency: '3-4×/week', progression: 'Progress to standing cable pull-down with scapular control', grade: 'A', evidence: EVIDENCE_DB.shoulder_exercise[0], phase: 'subacute', rationale: '' }],
    spasm: [],
  },
  serratus_anterior: {
    shortened: [],
    inhibited: [{ name: 'Wall push-up plus (serratus punch)', targetMuscle: 'Serratus Anterior', muscleIssue: 'inhibited', type: 'activation', sets: '3', reps: '12', hold: '3s protraction', frequency: 'Daily', progression: 'Progress to floor push-up plus, then dynamic push-up plus', grade: 'A', evidence: EVIDENCE_DB.shoulder_exercise[0], phase: 'acute', rationale: '' }],
    overactive: [],
    weak: [{ name: 'Push-up plus progression', targetMuscle: 'Serratus Anterior', muscleIssue: 'weak', type: 'strengthening', sets: '3', reps: '10-15', hold: '2s', frequency: '3×/week', progression: 'Wall → incline → floor → weighted', grade: 'A', evidence: EVIDENCE_DB.shoulder_exercise[0], phase: 'subacute', rationale: '' }],
    spasm: [],
  },
  gluteus_maximus: {
    shortened: [],
    inhibited: [{ name: 'Glute bridge with isometric hold', targetMuscle: 'Gluteus Maximus', muscleIssue: 'inhibited', type: 'activation', sets: '3', reps: '10', hold: '5s', frequency: 'Daily', progression: 'Single-leg bridge at week 3, add resistance band at week 5', grade: 'B', evidence: EVIDENCE_DB.hip_exercise[0], phase: 'acute', rationale: '' }],
    overactive: [],
    weak: [{ name: 'Hip thrust progression', targetMuscle: 'Gluteus Maximus', muscleIssue: 'weak', type: 'strengthening', sets: '3', reps: '10-12', hold: '2s', frequency: '3×/week', progression: 'BW → banded → barbell hip thrust', grade: 'B', evidence: EVIDENCE_DB.hip_exercise[0], phase: 'subacute', rationale: '' }],
    spasm: [{ name: 'Gluteal release with tennis ball', targetMuscle: 'Gluteus Maximus', muscleIssue: 'spasm', type: 'stretch', sets: '1', reps: '1', hold: '2-3 min', frequency: '2×/day', progression: 'Transition to foam roller at week 2', grade: 'B', evidence: EVIDENCE_DB.myofascial_release[0], phase: 'acute', rationale: '' }],
  },
  gluteus_medius: {
    shortened: [],
    inhibited: [{ name: 'Side-lying hip abduction (clam)', targetMuscle: 'Gluteus Medius', muscleIssue: 'inhibited', type: 'activation', sets: '3', reps: '12', hold: '3s', frequency: 'Daily', progression: 'Add resistance band at week 2, standing hip hitch at week 4', grade: 'B', evidence: EVIDENCE_DB.hip_exercise[1], phase: 'acute', rationale: '' }],
    overactive: [],
    weak: [{ name: 'Single-leg stance with perturbation', targetMuscle: 'Gluteus Medius', muscleIssue: 'weak', type: 'stabilization', sets: '3', reps: '30s each leg', hold: '30s', frequency: '3×/week', progression: 'Unstable surface → eyes closed → external perturbation', grade: 'B', evidence: EVIDENCE_DB.hip_exercise[1], phase: 'subacute', rationale: '' }],
    spasm: [],
  },
  hip_flexors: {
    shortened: [{ name: 'Half-kneeling hip flexor stretch (Thomas position)', targetMuscle: 'Iliopsoas / Rectus Femoris', muscleIssue: 'shortened', type: 'stretch', sets: '3', reps: '1', hold: '30-45s each side', frequency: '2-3×/day', progression: 'Add posterior pelvic tilt emphasis, then elevated rear foot stretch', grade: 'B', evidence: EVIDENCE_DB.stretching[0], phase: 'acute', rationale: '' }],
    inhibited: [],
    overactive: [{ name: 'Hip flexor inhibition with glute activation', targetMuscle: 'Iliopsoas', muscleIssue: 'overactive', type: 'neuromuscular', sets: '3', reps: '10', hold: '5s glute squeeze', frequency: 'Daily', progression: 'Supine → standing → single-leg functional patterns', grade: 'B', evidence: EVIDENCE_DB.lower_cross[0], phase: 'subacute', rationale: '' }],
    weak: [],
    spasm: [{ name: 'Psoas positional release', targetMuscle: 'Iliopsoas', muscleIssue: 'spasm', type: 'stretch', sets: '3', reps: '1', hold: '90s', frequency: '2×/day', progression: 'Gentle stretching at week 2', grade: 'B', evidence: EVIDENCE_DB.trigger_point[0], phase: 'acute', rationale: '' }],
  },
  hamstrings: {
    shortened: [{ name: 'Active hamstring stretch (90/90 position)', targetMuscle: 'Hamstrings', muscleIssue: 'shortened', type: 'stretch', sets: '3', reps: '1', hold: '30s each leg', frequency: '2×/day', progression: 'Progress to PNF contract-relax at week 3', grade: 'B', evidence: EVIDENCE_DB.stretching[0], phase: 'acute', rationale: '' }],
    inhibited: [{ name: 'Prone hamstring curl isometric', targetMuscle: 'Hamstrings', muscleIssue: 'inhibited', type: 'activation', sets: '3', reps: '10', hold: '5s', frequency: 'Daily', progression: 'Add resistance band, progress to Nordic curls', grade: 'B', evidence: EVIDENCE_DB.eccentric[0], phase: 'acute', rationale: '' }],
    overactive: [],
    weak: [{ name: 'Nordic hamstring curl (eccentric)', targetMuscle: 'Hamstrings', muscleIssue: 'weak', type: 'strengthening', sets: '3', reps: '5-8', hold: 'Eccentric control', frequency: '2-3×/week', progression: 'Increase range over 6 weeks, add load at week 8', grade: 'A', evidence: EVIDENCE_DB.eccentric[0], phase: 'subacute', rationale: '' }],
    spasm: [{ name: 'Hamstring positional release + heat', targetMuscle: 'Hamstrings', muscleIssue: 'spasm', type: 'stretch', sets: '3', reps: '1', hold: '60s', frequency: '3×/day', progression: 'Active stretching at week 1-2', grade: 'B', evidence: EVIDENCE_DB.stretching[0], phase: 'acute', rationale: '' }],
  },
  quadriceps: {
    shortened: [{ name: 'Standing quadriceps stretch with posterior tilt', targetMuscle: 'Quadriceps', muscleIssue: 'shortened', type: 'stretch', sets: '3', reps: '1', hold: '30s each leg', frequency: '2×/day', progression: 'Couch stretch progression at week 3', grade: 'B', evidence: EVIDENCE_DB.stretching[0], phase: 'acute', rationale: '' }],
    inhibited: [{ name: 'Terminal knee extension (VMO focus)', targetMuscle: 'Quadriceps (VMO)', muscleIssue: 'inhibited', type: 'activation', sets: '3', reps: '15', hold: '3s', frequency: 'Daily', progression: 'Add resistance band, progress to step-downs', grade: 'B', evidence: EVIDENCE_DB.knee_exercise[1], phase: 'acute', rationale: '' }],
    overactive: [],
    weak: [{ name: 'Wall sit progression', targetMuscle: 'Quadriceps', muscleIssue: 'weak', type: 'strengthening', sets: '3', reps: '30-60s', hold: 'Isometric', frequency: '3×/week', progression: 'Wall sit → split squat → single-leg squat', grade: 'B', evidence: EVIDENCE_DB.knee_exercise[0], phase: 'subacute', rationale: '' }],
    spasm: [],
  },
  transversus_abdominis: {
    shortened: [],
    inhibited: [{ name: 'Abdominal draw-in maneuver (ADIM)', targetMuscle: 'Transversus Abdominis', muscleIssue: 'inhibited', type: 'activation', sets: '3', reps: '10', hold: '10s with normal breathing', frequency: '3×/day', progression: 'Hook-lying → 4-point kneeling → standing → functional tasks', grade: 'A', evidence: EVIDENCE_DB.core_stability[0], phase: 'acute', rationale: '' }],
    overactive: [],
    weak: [{ name: 'Dead bug progression', targetMuscle: 'Transversus Abdominis', muscleIssue: 'weak', type: 'stabilization', sets: '3', reps: '8-10 each side', hold: '3s', frequency: '3-4×/week', progression: 'Arms only → legs only → contralateral → add resistance', grade: 'A', evidence: EVIDENCE_DB.core_stability[1], phase: 'subacute', rationale: '' }],
    spasm: [],
  },
  multifidus: {
    shortened: [],
    inhibited: [{ name: 'Prone multifidus activation (co-contraction)', targetMuscle: 'Lumbar Multifidus', muscleIssue: 'inhibited', type: 'activation', sets: '3', reps: '10', hold: '10s', frequency: '2×/day', progression: 'Co-contraction with leg lift, then bird-dog progression', grade: 'A', evidence: EVIDENCE_DB.core_stability[1], phase: 'acute', rationale: '' }],
    overactive: [],
    weak: [{ name: 'Bird-dog progression', targetMuscle: 'Lumbar Multifidus', muscleIssue: 'weak', type: 'stabilization', sets: '3', reps: '10 each side', hold: '5s', frequency: '3-4×/week', progression: 'Static hold → dynamic movement → add resistance band → unstable surface', grade: 'A', evidence: EVIDENCE_DB.core_stability[1], phase: 'subacute', rationale: '' }],
    spasm: [{ name: 'Lumbar multifidus release', targetMuscle: 'Lumbar Multifidus', muscleIssue: 'spasm', type: 'stretch', sets: '1', reps: '1', hold: '2-3 min per level', frequency: '1×/day', progression: 'Combine with gentle cat-cow mobilisation', grade: 'B', evidence: EVIDENCE_DB.trigger_point[0], phase: 'acute', rationale: '' }],
  },
  calves: {
    shortened: [{ name: 'Wall calf stretch (gastroc + soleus)', targetMuscle: 'Gastrocnemius/Soleus', muscleIssue: 'shortened', type: 'stretch', sets: '3', reps: '1 each position', hold: '30s', frequency: '2-3×/day', progression: 'Add incline board stretch at week 3', grade: 'B', evidence: EVIDENCE_DB.stretching[0], phase: 'acute', rationale: '' }],
    inhibited: [],
    overactive: [],
    weak: [{ name: 'Heel raise progression', targetMuscle: 'Gastrocnemius/Soleus', muscleIssue: 'weak', type: 'strengthening', sets: '3', reps: '15-20', hold: '2s top', frequency: '3×/week', progression: 'Bilateral → single-leg → eccentric loading → weighted', grade: 'A', evidence: EVIDENCE_DB.eccentric[0], phase: 'subacute', rationale: '' }],
    spasm: [{ name: 'Calf foam rolling + gentle stretch', targetMuscle: 'Gastrocnemius/Soleus', muscleIssue: 'spasm', type: 'stretch', sets: '1', reps: '1', hold: '2 min rolling + 30s stretch', frequency: '2×/day', progression: 'Active stretching at week 1', grade: 'B', evidence: EVIDENCE_DB.myofascial_release[0], phase: 'acute', rationale: '' }],
  },
};

function matchMuscleKey(muscleLabel: string): string | null {
  const label = muscleLabel.toLowerCase();
  const mappings: [string[], string][] = [
    [['upper trap', 'upper trapezius'], 'upper_trapezius'],
    [['levator', 'levator scapulae'], 'levator_scapulae'],
    [['pec', 'pectoralis', 'chest'], 'pectoralis'],
    [['deep neck', 'longus', 'deep cervical'], 'deep_neck_flexors'],
    [['lower trap', 'lower trapezius'], 'lower_trapezius'],
    [['serratus', 'serratus anterior'], 'serratus_anterior'],
    [['glute max', 'gluteus maximus', 'glut max'], 'gluteus_maximus'],
    [['glute med', 'gluteus medius', 'glut med'], 'gluteus_medius'],
    [['hip flexor', 'iliopsoas', 'psoas', 'iliacus', 'rectus femoris'], 'hip_flexors'],
    [['hamstring', 'biceps femoris', 'semimembran', 'semitendin'], 'hamstrings'],
    [['quad', 'vastus', 'rectus fem', 'vmo'], 'quadriceps'],
    [['transversus', 'tva', 'transverse abdomin'], 'transversus_abdominis'],
    [['multifidus', 'multifidi'], 'multifidus'],
    [['calf', 'gastroc', 'soleus', 'gastrocnemius', 'plantar flex'], 'calves'],
  ];
  for (const [keywords, key] of mappings) {
    if (keywords.some(k => label.includes(k))) return key;
  }
  return null;
}

function regionFromLabel(label: string): string {
  const l = label.toLowerCase();
  if (['cervic', 'neck', 'suboccip', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].some(k => l.includes(k))) return 'cervical';
  if (['shoulder', 'rotator', 'deltoid', 'scapul', 'acromio', 'glenohumeral', 'subacromial'].some(k => l.includes(k))) return 'shoulder';
  if (['thorac', 'rib', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12'].some(k => l.includes(k))) return 'thoracic';
  if (['lumbar', 'low back', 'l1', 'l2', 'l3', 'l4', 'l5', 'sacro', 'si joint'].some(k => l.includes(k))) return 'lumbar';
  if (['hip', 'glute', 'pelvi', 'iliac', 'femoral head', 'acetabul', 'trochant', 'groin'].some(k => l.includes(k))) return 'hip';
  if (['knee', 'patell', 'tibiofe', 'meniscus', 'acl', 'mcl'].some(k => l.includes(k))) return 'knee';
  if (['ankle', 'talocrural', 'subtalar', 'foot', 'calcaneus', 'achilles', 'plantar'].some(k => l.includes(k))) return 'ankle';
  if (['elbow', 'epicondyl', 'olecranon', 'radial head'].some(k => l.includes(k))) return 'shoulder';
  if (['wrist', 'carpal'].some(k => l.includes(k))) return 'shoulder';
  return 'lumbar';
}

function buildClinicalReasoning(input: TreatmentInput): ClinicalReasoning {
  const { correlationResult, muscles, forces, painMarkers } = input;
  const abnormalMuscles = muscles.filter(m => m.clinicalStatus !== 'normal');
  const highForces = forces.filter(f => f.status === 'high' || f.status === 'very_high');
  const keyFindings: { finding: string; significance: string; source: string }[] = [];

  if (correlationResult) {
    for (const pc of correlationResult.painCorrelations) {
      keyFindings.push({ finding: `Pain at ${pc.markerLabel} (severity ${pc.severity}/10)`, significance: `Primary complaint requiring ${pc.severity >= 7 ? 'priority' : 'standard'} intervention`, source: 'Pain Assessment' });
      for (const comp of pc.compensationPatterns) {
        keyFindings.push({ finding: comp.pattern, significance: comp.description, source: 'Compensation Analysis' });
      }
    }
    for (const gc of correlationResult.globalCompensations) {
      keyFindings.push({ finding: gc.label, significance: gc.clinicalSignificance, source: 'Global Compensation Pattern' });
    }
  }

  for (const m of abnormalMuscles.slice(0, 6)) {
    keyFindings.push({ finding: `${m.label}: ${m.clinicalStatus}`, significance: `Tightness ${m.tightnessPercent.toFixed(0)}%, Inhibition ${m.inhibitionPercent.toFixed(0)}%`, source: 'Muscle Analysis' });
  }

  for (const f of highForces.slice(0, 4)) {
    keyFindings.push({ finding: `${f.label}: ${f.status} loading`, significance: f.clinical, source: 'Force Analysis' });
  }

  const regions = painMarkers.map(pm => pm.region || regionFromLabel(pm.label));
  const primaryRegion = regions[0] || 'musculoskeletal';

  const rootCauses = correlationResult?.painCorrelations.flatMap(pc => pc.rootCauseChain) || [];
  const mechanism = rootCauses.length > 0
    ? rootCauses.map(rc => `${rc.structure}: ${rc.finding} → ${rc.mechanism}`).join('; ')
    : 'Postural dysfunction with muscular imbalance leading to altered loading patterns';

  const hasUpperCross = correlationResult?.globalCompensations.some(gc => gc.label.toLowerCase().includes('upper cross'));
  const hasLowerCross = correlationResult?.globalCompensations.some(gc => gc.label.toLowerCase().includes('lower cross'));
  const primaryDiagnosis = hasUpperCross
    ? `Upper Crossed Syndrome with ${primaryRegion} involvement`
    : hasLowerCross
    ? `Lower Crossed Syndrome with ${primaryRegion} involvement`
    : painMarkers.length > 0
    ? `${primaryRegion.charAt(0).toUpperCase() + primaryRegion.slice(1)} musculoskeletal dysfunction with associated muscle imbalance`
    : 'Postural musculoskeletal dysfunction';

  const differentials: string[] = [];
  if (primaryRegion === 'cervical') differentials.push('Cervicogenic headache', 'Cervical radiculopathy', 'Mechanical neck pain', 'Myofascial pain syndrome');
  else if (primaryRegion === 'shoulder') differentials.push('Rotator cuff tendinopathy', 'Subacromial impingement', 'Adhesive capsulitis', 'Scapular dyskinesis');
  else if (primaryRegion === 'lumbar') differentials.push('Non-specific low back pain', 'Lumbar disc herniation', 'Facet joint dysfunction', 'SI joint dysfunction');
  else if (primaryRegion === 'hip') differentials.push('Femoroacetabular impingement', 'Hip labral tear', 'Greater trochanteric pain syndrome', 'Gluteal tendinopathy');
  else if (primaryRegion === 'knee') differentials.push('Patellofemoral pain syndrome', 'Patellar tendinopathy', 'IT band syndrome', 'Meniscal pathology');
  else differentials.push('Regional musculoskeletal dysfunction', 'Myofascial pain syndrome', 'Postural overload syndrome');

  const prognosticFactors: { factor: string; impact: 'positive' | 'negative' | 'neutral' }[] = [];
  const riskScore = correlationResult?.overallRiskScore || 0;
  if (riskScore > 60) prognosticFactors.push({ factor: 'High clinical risk score — multiple concurrent findings', impact: 'negative' });
  else if (riskScore < 30) prognosticFactors.push({ factor: 'Low clinical risk — favorable recovery outlook', impact: 'positive' });
  if (abnormalMuscles.length > 10) prognosticFactors.push({ factor: 'Widespread muscle imbalance — may require longer rehabilitation', impact: 'negative' });
  if (highForces.length > 5) prognosticFactors.push({ factor: 'Multiple joints with elevated loading — systemic postural contribution', impact: 'negative' });
  if (painMarkers.length <= 1) prognosticFactors.push({ factor: 'Localized complaint — targeted treatment likely effective', impact: 'positive' });
  prognosticFactors.push({ factor: 'Active engagement in exercise program', impact: 'positive' });

  return {
    summary: `Clinical assessment reveals ${painMarkers.length > 0 ? `${painMarkers.length} pain region(s)` : 'postural dysfunction'} with ${abnormalMuscles.length} muscles showing clinical abnormalities and ${highForces.length} joints under elevated loading. ${correlationResult?.globalCompensations.length ? `${correlationResult.globalCompensations.length} compensation pattern(s) identified.` : ''} Root cause analysis suggests ${mechanism.substring(0, 200)}.`,
    primaryDiagnosis,
    differentials,
    keyFindings: keyFindings.slice(0, 12),
    mechanismOfInjury: mechanism,
    prognosticFactors,
  };
}

function buildExercisesForMuscle(muscle: IndividualMuscle, phase: TreatmentPhase): ExercisePrescription[] {
  const key = matchMuscleKey(muscle.label);
  if (!key || !MUSCLE_EXERCISE_DB[key]) return [];
  const db = MUSCLE_EXERCISE_DB[key];
  const status = muscle.clinicalStatus;
  let exercises: ExercisePrescription[] = [];
  if (status === 'shortened' && db.shortened.length > 0) exercises = db.shortened;
  else if (status === 'inhibited' && db.inhibited.length > 0) exercises = db.inhibited;
  else if (status === 'overactive' && db.overactive.length > 0) exercises = db.overactive;
  else if (status === 'weak' && db.weak.length > 0) exercises = db.weak;
  else if (status === 'spasm' && db.spasm.length > 0) exercises = db.spasm;
  else if (status === 'lengthened' && db.weak.length > 0) exercises = db.weak;

  return exercises
    .filter(e => e.phase === phase || (phase === 'subacute' && e.phase === 'acute') || phase === 'maintenance')
    .map(e => ({
      ...e,
      rationale: `${muscle.label} is ${status} (tightness: ${muscle.tightnessPercent.toFixed(0)}%, inhibition: ${muscle.inhibitionPercent.toFixed(0)}%, activation: ${muscle.activationPercent.toFixed(0)}%). ${status === 'shortened' || status === 'overactive' ? 'Lengthening and inhibition required to restore normal length-tension relationship.' : status === 'inhibited' || status === 'weak' ? 'Activation and progressive strengthening needed to restore motor control and force production.' : status === 'spasm' ? 'Spasm reduction through gentle techniques before progressing to active rehabilitation.' : 'Restoring normal muscle function and balance.'}`,
    }));
}

function buildManualTherapyForRegion(region: string, phase: TreatmentPhase, findings: { finding: string; significance: string; source: string }[]): ManualTherapyTechnique[] {
  const techniques = REGION_MANUAL_THERAPY[region] || [];
  return techniques
    .filter(t => t.phase === phase || (phase === 'subacute' && t.phase === 'acute'))
    .map(t => {
      const relevantFinding = findings.find(f =>
        f.finding.toLowerCase().includes(t.targetTissue.toLowerCase().substring(0, 8)) ||
        t.targetTissue.toLowerCase().includes(f.finding.toLowerCase().substring(0, 8))
      );
      return {
        ...t,
        rationale: relevantFinding
          ? `Applied to address: ${relevantFinding.finding} (${relevantFinding.significance}). ${t.targetTissue} treatment aims to restore normal tissue extensibility and joint mechanics.`
          : `Targeting ${t.targetTissue} to restore normal ${region} biomechanics and reduce tissue-specific loading.`,
      };
    });
}

export function generateTreatmentPlan(input: TreatmentInput): TreatmentPlan {
  const clinicalReasoning = buildClinicalReasoning(input);
  const abnormalMuscles = input.muscles.filter(m => m.clinicalStatus !== 'normal');
  const highForces = input.forces.filter(f => f.status === 'high' || f.status === 'very_high');

  const involvedRegions = new Set<string>();
  for (const pm of input.painMarkers) involvedRegions.add(pm.region || regionFromLabel(pm.label));
  for (const m of abnormalMuscles) involvedRegions.add(regionFromLabel(m.label));
  for (const f of highForces) involvedRegions.add(regionFromLabel(f.label));
  if (involvedRegions.size === 0) involvedRegions.add('lumbar');

  const phases: PhaseBlock[] = [];
  const regionsArr = Array.from(involvedRegions);

  const acuteExercises: ExercisePrescription[] = [];
  const subacuteExercises: ExercisePrescription[] = [];
  const maintenanceExercises: ExercisePrescription[] = [];

  const prioritized = abnormalMuscles.sort((a, b) => {
    const severityOrder: Record<string, number> = { spasm: 5, inhibited: 4, overactive: 3, shortened: 3, weak: 3, lengthened: 2, normal: 0 };
    return (severityOrder[b.clinicalStatus] || 0) - (severityOrder[a.clinicalStatus] || 0);
  });

  for (const muscle of prioritized.slice(0, 12)) {
    acuteExercises.push(...buildExercisesForMuscle(muscle, 'acute'));
    subacuteExercises.push(...buildExercisesForMuscle(muscle, 'subacute'));
    maintenanceExercises.push(...buildExercisesForMuscle(muscle, 'maintenance'));
  }

  const acuteManual: ManualTherapyTechnique[] = [];
  const subacuteManual: ManualTherapyTechnique[] = [];
  for (const region of regionsArr) {
    acuteManual.push(...buildManualTherapyForRegion(region, 'acute', clinicalReasoning.keyFindings));
    subacuteManual.push(...buildManualTherapyForRegion(region, 'subacute', clinicalReasoning.keyFindings));
  }

  const painSeverity = input.painMarkers.length > 0 ? Math.max(...input.painMarkers.map(pm => pm.severity)) : 3;
  const riskScore = input.correlationResult?.overallRiskScore || 0;

  phases.push({
    phase: 'acute',
    label: 'Phase 1: Acute Management',
    timeframe: painSeverity >= 7 ? 'Weeks 1-3' : 'Weeks 1-2',
    goals: [
      'Pain reduction and symptom management',
      'Reduce muscle spasm and guarding',
      'Restore basic range of motion',
      'Initiate motor control retraining for inhibited muscles',
      'Patient education on condition and self-management',
    ],
    manualTherapy: acuteManual.slice(0, 6),
    exercises: acuteExercises.slice(0, 8),
    milestones: [
      { week: 1, phase: 'acute', title: 'Initial Response', criteria: ['Pain reduced by 20-30% from baseline', 'Able to perform basic ADLs with modified activities', 'Understanding of diagnosis and management plan'], expectedOutcomes: ['Reduced resting pain', 'Improved sleep quality', 'Compliance with home exercise program'] },
      { week: painSeverity >= 7 ? 3 : 2, phase: 'acute', title: 'Acute Phase Completion', criteria: ['Pain at rest < 3/10', 'ROM within 80% of expected', 'Able to perform all Phase 1 exercises correctly'], expectedOutcomes: ['Resolved muscle spasm', 'Basic motor control established', 'Ready for progressive loading'] },
    ],
    precautions: [
      'Avoid aggravating activities and sustained end-range positions',
      'Apply ice 15-20 min after treatment if increased soreness',
      painSeverity >= 7 ? 'Consider analgesic medication consultation if pain not settling' : 'Gentle movement encouraged within pain-free range',
      'Monitor for red flags: progressive neurological deficit, saddle anaesthesia, unexplained weight loss',
    ],
  });

  phases.push({
    phase: 'subacute',
    label: 'Phase 2: Restoration & Loading',
    timeframe: painSeverity >= 7 ? 'Weeks 4-8' : 'Weeks 3-6',
    goals: [
      'Progressive strengthening of weakened/inhibited muscles',
      'Restore full ROM and joint mobility',
      'Address kinetic chain dysfunctions',
      'Correct movement patterns and biomechanics',
      'Gradual return to functional activities',
    ],
    manualTherapy: subacuteManual.slice(0, 5),
    exercises: subacuteExercises.slice(0, 10),
    milestones: [
      { week: painSeverity >= 7 ? 5 : 4, phase: 'subacute', title: 'Mid-Phase Check', criteria: ['Pain during activity < 3/10', 'ROM within 90% of expected', 'Able to perform loaded exercises with correct form'], expectedOutcomes: ['Measurable strength improvement', 'Improved postural alignment', 'Reduced compensation patterns'] },
      { week: painSeverity >= 7 ? 8 : 6, phase: 'subacute', title: 'Restoration Complete', criteria: ['Full pain-free ROM', 'Strength within 80% of contralateral/expected', 'Normal movement patterns during functional tasks', 'Resolved compensation patterns'], expectedOutcomes: ['Functional capacity restored', 'Able to tolerate sustained activities', 'Independent with full exercise program'] },
    ],
    precautions: [
      'Progressive loading — increase by no more than 10-15% per week',
      'Monitor for flare-ups; reduce load if pain increases >2/10 above baseline',
      'Ensure quality of movement before increasing load or complexity',
    ],
  });

  phases.push({
    phase: 'maintenance',
    label: 'Phase 3: Return to Function & Prevention',
    timeframe: painSeverity >= 7 ? 'Weeks 9-12+' : 'Weeks 7-10+',
    goals: [
      'Full return to work, sport, and recreational activities',
      'Maintain gains through independent exercise program',
      'Address remaining biomechanical deficits',
      'Injury prevention and long-term self-management',
      'Discharge planning with maintenance program',
    ],
    manualTherapy: [],
    exercises: maintenanceExercises.slice(0, 8),
    milestones: [
      { week: painSeverity >= 7 ? 10 : 8, phase: 'maintenance', title: 'Functional Return', criteria: ['Pain-free during all activities', 'Full strength and endurance', 'Normal biomechanics under load', 'Confident with self-management'], expectedOutcomes: ['Full return to activities', 'Independent exercise maintenance', 'Understanding of prevention strategies'] },
      { week: painSeverity >= 7 ? 12 : 10, phase: 'maintenance', title: 'Discharge', criteria: ['All functional goals met', 'Independent with maintenance program', 'No recurrence of symptoms for 2+ weeks'], expectedOutcomes: ['Discharged with home program', 'Follow-up PRN or at 3 months', 'Long-term self-management'] },
    ],
    precautions: [
      'Gradual return to full activities — avoid sudden increases in demand',
      'Maintain exercise program 2-3×/week for injury prevention',
      'Seek early re-assessment if symptoms recur',
    ],
  });

  const redFlags: string[] = [
    'Progressive neurological deficit',
    'Cauda equina symptoms (saddle anaesthesia, bladder/bowel changes)',
    'Unexplained weight loss',
    'Night pain unrelated to position',
    'History of cancer with new onset pain',
    'Signs of vertebral artery insufficiency (5D\'s: dizziness, diplopia, dysarthria, dysphagia, drop attacks)',
  ];

  const outcomesMeasures = [
    'Numeric Pain Rating Scale (NPRS) — target 50% reduction by Phase 2',
    'Patient-Specific Functional Scale (PSFS)',
    'Active ROM measurement — goniometry',
    'Strength testing — MMT or dynamometry',
    'Functional movement assessment (e.g., FMS, single-leg squat quality)',
  ];

  if (regionsArr.includes('cervical')) outcomesMeasures.push('Neck Disability Index (NDI)');
  if (regionsArr.includes('lumbar')) outcomesMeasures.push('Oswestry Disability Index (ODI)');
  if (regionsArr.includes('shoulder')) outcomesMeasures.push('DASH / QuickDASH');
  if (regionsArr.includes('knee')) outcomesMeasures.push('KOOS — Knee injury and Osteoarthritis Outcome Score');

  const overallTimeline = riskScore > 60
    ? '10-14 weeks (complex presentation — multiple concurrent findings)'
    : riskScore > 30
    ? '8-10 weeks (moderate complexity — some concurrent findings)'
    : '6-8 weeks (straightforward — localized findings)';

  return { clinicalReasoning, phases, overallTimeline, redFlags, outcomesMeasures };
}
