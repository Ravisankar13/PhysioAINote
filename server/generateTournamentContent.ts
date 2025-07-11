/**
 * Generate comprehensive tournament Lightning Diagnosis content
 * 15 questions per round, 3 rounds total (45 questions)
 * 10 seconds per question
 */

import { db } from './db';
import { gameContent } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface LightningDiagnosisCase {
  id: string;
  options: string[];
  question: string;
  body_part: string;
  rationale: string;
  difficulty: string;
  time_limit: number;
  case_number: number;
  correct_answer: string;
  clinical_findings: string;
  patient_presentation: string;
}

export async function generateComprehensiveTournamentContent() {
  console.log('Generating comprehensive tournament content...');

  // Round 1 - Easy Questions (15 questions, 10 seconds each)
  const easyQuestions: LightningDiagnosisCase[] = [
    {
      id: "easy_1",
      options: ["Lateral ankle sprain", "Achilles tendinopathy", "Peroneal tendon subluxation", "Ankle fracture"],
      question: "What is the most likely diagnosis?",
      body_part: "ankle",
      rationale: "Classic presentation of lateral ankle sprain with ATFL involvement, common in soccer players.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 1,
      correct_answer: "Lateral ankle sprain",
      clinical_findings: "Lateral ankle swelling, point tenderness over ATFL, positive anterior drawer test.",
      patient_presentation: "22-year-old soccer player with immediate onset ankle pain after landing awkwardly during a game."
    },
    {
      id: "easy_2",
      options: ["Frozen shoulder", "Subacromial impingement", "Rotator cuff tear", "AC joint arthritis"],
      question: "What is the primary diagnosis?",
      body_part: "shoulder",
      rationale: "Painful arc and positive Hawkins test are classic signs of subacromial impingement syndrome.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 2,
      correct_answer: "Subacromial impingement",
      clinical_findings: "Painful arc 60-120°, positive Hawkins test, weakness in external rotation.",
      patient_presentation: "45-year-old office worker with gradual onset shoulder pain over 3 months, worse with overhead activities."
    },
    {
      id: "easy_3",
      options: ["Achilles tendinopathy", "Plantar fasciitis", "Calcaneal stress fracture", "Tarsal tunnel syndrome"],
      question: "What is the most likely diagnosis?",
      body_part: "foot",
      rationale: "Classic morning pain and medial heel tenderness are hallmarks of plantar fasciitis.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 3,
      correct_answer: "Plantar fasciitis",
      clinical_findings: "Point tenderness at medial calcaneal tuberosity, pain with passive dorsiflexion, tight calf muscles.",
      patient_presentation: "35-year-old runner with gradual onset heel pain, worst in the morning and after periods of rest."
    },
    {
      id: "easy_4",
      options: ["Lateral epicondylitis", "Medial epicondylitis", "Radial tunnel syndrome", "Posterior interosseous nerve entrapment"],
      question: "What is the primary diagnosis?",
      body_part: "elbow",
      rationale: "Tennis elbow (lateral epicondylitis) with classic presentation in a tennis player.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 4,
      correct_answer: "Lateral epicondylitis",
      clinical_findings: "Tenderness over lateral epicondyle, pain with resisted wrist extension, grip strength reduced.",
      patient_presentation: "28-year-old tennis player with lateral elbow pain developing over 2 weeks of increased playing."
    },
    {
      id: "easy_5",
      options: ["Cervical radiculopathy", "Whiplash-associated disorder", "Cervical myelopathy", "Torticollis"],
      question: "What is the most likely diagnosis?",
      body_part: "neck",
      rationale: "Recent MVA with neck pain and headaches suggests whiplash-associated disorder.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 5,
      correct_answer: "Whiplash-associated disorder",
      clinical_findings: "Reduced cervical ROM, upper trapezius muscle spasm, headaches radiating from occiput.",
      patient_presentation: "42-year-old desk worker with neck pain and headaches after a motor vehicle accident 1 week ago."
    },
    {
      id: "easy_6",
      options: ["Patellofemoral pain syndrome", "Patellar tendinopathy", "IT band syndrome", "Medial meniscus tear"],
      question: "What is the most likely diagnosis?",
      body_part: "knee",
      rationale: "Anterior knee pain worse with stairs and prolonged sitting suggests PFPS.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 6,
      correct_answer: "Patellofemoral pain syndrome",
      clinical_findings: "Positive J-sign, crepitus with knee flexion, pain with prolonged sitting.",
      patient_presentation: "19-year-old student with anterior knee pain, worse going down stairs and after sitting in lectures."
    },
    {
      id: "easy_7",
      options: ["Mechanical low back pain", "Disc herniation", "Spinal stenosis", "Spondylolisthesis"],
      question: "What is the most likely diagnosis?",
      body_part: "back",
      rationale: "Mechanical low back pain with no neurological symptoms in young person.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 7,
      correct_answer: "Mechanical low back pain",
      clinical_findings: "Pain with forward flexion, no neurological signs, normal reflexes.",
      patient_presentation: "25-year-old warehouse worker with acute onset lower back pain after lifting heavy boxes."
    },
    {
      id: "easy_8",
      options: ["Carpal tunnel syndrome", "De Quervain's tenosynovitis", "Trigger finger", "Wrist arthritis"],
      question: "What is the primary diagnosis?",
      body_part: "wrist",
      rationale: "Classic presentation of carpal tunnel syndrome with nocturnal symptoms.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 8,
      correct_answer: "Carpal tunnel syndrome",
      clinical_findings: "Positive Tinel's sign, numbness in median nerve distribution, weak thumb opposition.",
      patient_presentation: "50-year-old office worker with numbness in thumb and fingers, worse at night."
    },
    {
      id: "easy_9",
      options: ["Hip flexor strain", "Hip osteoarthritis", "Labral tear", "Trochanteric bursitis"],
      question: "What is the most likely diagnosis?",
      body_part: "hip",
      rationale: "Gradual onset hip pain with stiffness in older patient suggests OA.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 9,
      correct_answer: "Hip osteoarthritis",
      clinical_findings: "Reduced hip internal rotation, morning stiffness <30 minutes, crepitus.",
      patient_presentation: "65-year-old with gradual onset hip pain and stiffness, worse in the morning."
    },
    {
      id: "easy_10",
      options: ["Achilles tendinopathy", "Calf muscle strain", "DVT", "Compartment syndrome"],
      question: "What is the most likely diagnosis?",
      body_part: "calf",
      rationale: "Acute onset calf pain during activity suggests muscle strain.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 10,
      correct_answer: "Calf muscle strain",
      clinical_findings: "Palpable defect in medial gastrocnemius, positive Thompson test negative.",
      patient_presentation: "40-year-old recreational runner with sudden onset calf pain during sprint."
    },
    {
      id: "easy_11",
      options: ["Rotator cuff tendinopathy", "Biceps tendinopathy", "AC joint injury", "Glenohumeral instability"],
      question: "What is the primary diagnosis?",
      body_part: "shoulder",
      rationale: "Biceps tendinopathy with anterior shoulder pain and positive Speed's test.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 11,
      correct_answer: "Biceps tendinopathy",
      clinical_findings: "Positive Speed's test, anterior shoulder pain, pain with resisted shoulder flexion.",
      patient_presentation: "35-year-old swimmer with anterior shoulder pain, worse with overhead swimming strokes."
    },
    {
      id: "easy_12",
      options: ["Medial tibial stress syndrome", "Stress fracture", "Compartment syndrome", "Muscle strain"],
      question: "What is the most likely diagnosis?",
      body_part: "shin",
      rationale: "MTSS (shin splints) common in runners with diffuse medial tibial pain.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 12,
      correct_answer: "Medial tibial stress syndrome",
      clinical_findings: "Diffuse tenderness along medial tibial border, pain with activity.",
      patient_presentation: "22-year-old novice runner with shin pain that develops during running."
    },
    {
      id: "easy_13",
      options: ["Tension headache", "Cervicogenic headache", "Migraine", "Cluster headache"],
      question: "What type of headache is most likely?",
      body_part: "head",
      rationale: "Cervicogenic headache with neck involvement and unilateral presentation.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 13,
      correct_answer: "Cervicogenic headache",
      clinical_findings: "Unilateral headache, neck stiffness, pain originates from occiput.",
      patient_presentation: "30-year-old office worker with one-sided headaches and neck stiffness."
    },
    {
      id: "easy_14",
      options: ["Golfer's elbow", "Tennis elbow", "Cubital tunnel syndrome", "Radial nerve entrapment"],
      question: "What is the most likely diagnosis?",
      body_part: "elbow",
      rationale: "Medial epicondylitis (golfer's elbow) with medial elbow pain and grip weakness.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 14,
      correct_answer: "Golfer's elbow",
      clinical_findings: "Medial epicondyle tenderness, pain with resisted wrist flexion and pronation.",
      patient_presentation: "45-year-old golfer with medial elbow pain and grip weakness after increased playing."
    },
    {
      id: "easy_15",
      options: ["Ankle sprain", "Peroneal tendinopathy", "Sinus tarsi syndrome", "Ankle impingement"],
      question: "What is the most likely diagnosis?",
      body_part: "ankle",
      rationale: "Peroneal tendinopathy with lateral ankle pain and swelling behind lateral malleolus.",
      difficulty: "easy",
      time_limit: 10,
      case_number: 15,
      correct_answer: "Peroneal tendinopathy",
      clinical_findings: "Tenderness behind lateral malleolus, pain with resisted eversion.",
      patient_presentation: "28-year-old runner with lateral ankle pain and swelling after increasing training volume."
    }
  ];

  // Round 2 - Medium Questions (15 questions, 10 seconds each)
  const mediumQuestions: LightningDiagnosisCase[] = [
    {
      id: "medium_1",
      options: ["Patellofemoral pain syndrome only", "Meniscal tear with early osteoarthritis", "Patellar tendinopathy", "Iliotibial band syndrome"],
      question: "What is the most likely combined diagnosis?",
      body_part: "knee",
      rationale: "Positive McMurray test suggests meniscal tear, while crepitus and age suggest early OA.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 1,
      correct_answer: "Meniscal tear with early osteoarthritis",
      clinical_findings: "Crepitus with knee flexion, joint line tenderness, positive McMurray test, mild effusion.",
      patient_presentation: "55-year-old construction worker with 6-month history of knee pain, worse with stairs and kneeling."
    },
    {
      id: "medium_2",
      options: ["L4 nerve root", "L5 nerve root", "S1 nerve root", "S2 nerve root"],
      question: "What nerve root is most likely affected?",
      body_part: "back",
      rationale: "L5 nerve root involvement with specific dermatome and weakness pattern.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 2,
      correct_answer: "L5 nerve root",
      clinical_findings: "Positive straight leg raise at 45°, L5 dermatomal numbness, weakness in big toe extension.",
      patient_presentation: "38-year-old weightlifter with sudden onset lower back pain during deadlifting, with radiation to right leg."
    },
    {
      id: "medium_3",
      options: ["Hip flexor strain", "Adductor longus tendinopathy", "Athletic pubalgia (sports hernia)", "Hip impingement"],
      question: "What is the most specific diagnosis?",
      body_part: "hip",
      rationale: "Specific adductor testing and insertion point tenderness indicate adductor longus involvement.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 3,
      correct_answer: "Adductor longus tendinopathy",
      clinical_findings: "Pain with resisted hip adduction, positive squeeze test, tenderness at adductor longus insertion.",
      patient_presentation: "29-year-old basketball player with chronic groin pain, worse with cutting movements and hip flexion."
    },
    {
      id: "medium_4",
      options: ["Osteoarthritis", "Rheumatoid arthritis", "Carpal tunnel syndrome", "De Quervain's tenosynovitis"],
      question: "What condition should be suspected?",
      body_part: "hand",
      rationale: "Symmetrical joint involvement and prolonged morning stiffness suggest inflammatory arthritis.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 4,
      correct_answer: "Rheumatoid arthritis",
      clinical_findings: "Symmetrical joint swelling in MCPs and PIPs, positive squeeze test, morning stiffness >1 hour.",
      patient_presentation: "52-year-old pianist with hand pain and stiffness, particularly in the morning, affecting multiple joints."
    },
    {
      id: "medium_5",
      options: ["IT band syndrome", "Greater trochanteric pain syndrome", "Hip labral tear", "Piriformis syndrome"],
      question: "What is the primary diagnosis?",
      body_part: "hip",
      rationale: "Greater trochanteric tenderness and lateral hip pain pattern suggest GTPS.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 5,
      correct_answer: "Greater trochanteric pain syndrome",
      clinical_findings: "Positive Trendelenburg test, pain with resisted hip abduction, tenderness over greater trochanter.",
      patient_presentation: "44-year-old runner with lateral hip pain, worse when lying on affected side and during running."
    },
    {
      id: "medium_6",
      options: ["Cervical facet joint dysfunction", "Cervical disc herniation", "Thoracic outlet syndrome", "Scalene muscle tension"],
      question: "What is the most likely diagnosis?",
      body_part: "neck",
      rationale: "Facet joint dysfunction with unilateral neck pain and restricted rotation.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 6,
      correct_answer: "Cervical facet joint dysfunction",
      clinical_findings: "Unilateral neck pain, restricted cervical rotation, positive facet joint provocation tests.",
      patient_presentation: "40-year-old with sudden neck pain after sleeping in awkward position, unable to turn head fully."
    },
    {
      id: "medium_7",
      options: ["Subacromial bursitis", "Calcific tendinopathy", "Frozen shoulder", "Rotator cuff tear"],
      question: "What is the most likely diagnosis?",
      body_part: "shoulder",
      rationale: "Calcific tendinopathy with severe night pain and characteristic presentation.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 7,
      correct_answer: "Calcific tendinopathy",
      clinical_findings: "Severe night pain, limited passive ROM in all directions, x-ray shows calcification.",
      patient_presentation: "48-year-old with sudden onset severe shoulder pain, unable to sleep on affected side."
    },
    {
      id: "medium_8",
      options: ["Anterior cruciate ligament tear", "Posterior cruciate ligament tear", "Medial collateral ligament tear", "Lateral collateral ligament tear"],
      question: "What ligament is most likely injured?",
      body_part: "knee",
      rationale: "MCL tear with medial knee pain and positive valgus stress test.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 8,
      correct_answer: "Medial collateral ligament tear",
      clinical_findings: "Medial knee pain, positive valgus stress test, tender over MCL insertion.",
      patient_presentation: "25-year-old footballer with medial knee pain after tackle from the side."
    },
    {
      id: "medium_9",
      options: ["Lumbar spinal stenosis", "Piriformis syndrome", "Hip osteoarthritis", "Vascular claudication"],
      question: "What is the most likely diagnosis?",
      body_part: "back",
      rationale: "Neurogenic claudication with classic shopping cart sign and positional relief.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 9,
      correct_answer: "Lumbar spinal stenosis",
      clinical_findings: "Leg pain with walking, relief with forward flexion, shopping cart sign positive.",
      patient_presentation: "68-year-old with leg pain and weakness when walking, improves when leaning on shopping cart."
    },
    {
      id: "medium_10",
      options: ["Intersection syndrome", "De Quervain's tenosynovitis", "Scaphoid fracture", "Wrist arthritis"],
      question: "What is the most likely diagnosis?",
      body_part: "wrist",
      rationale: "Intersection syndrome with pain and crepitus 4cm proximal to Lister's tubercle.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 10,
      correct_answer: "Intersection syndrome",
      clinical_findings: "Pain and crepitus 4cm proximal to Lister's tubercle, worse with thumb movements.",
      patient_presentation: "32-year-old rower with forearm pain and swelling after increased training intensity."
    },
    {
      id: "medium_11",
      options: ["Plantar fasciitis", "Morton's neuroma", "Metatarsalgia", "Stress fracture"],
      question: "What is the most likely diagnosis?",
      body_part: "foot",
      rationale: "Morton's neuroma with classic presentation between 3rd and 4th toes.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 11,
      correct_answer: "Morton's neuroma",
      clinical_findings: "Sharp burning pain between 3rd and 4th toes, positive Mulder's click.",
      patient_presentation: "45-year-old woman with sharp forefoot pain, feels like walking on a pebble."
    },
    {
      id: "medium_12",
      options: ["Supraspinatus tendinopathy", "Infraspinatus tendinopathy", "Subscapularis tendinopathy", "Teres minor tendinopathy"],
      question: "Which tendon is most likely affected?",
      body_part: "shoulder",
      rationale: "Infraspinatus tendinopathy with external rotation weakness and pain.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 12,
      correct_answer: "Infraspinatus tendinopathy",
      clinical_findings: "Weakness in external rotation, positive external rotation resistance test.",
      patient_presentation: "38-year-old baseball pitcher with posterior shoulder pain and weakness in external rotation."
    },
    {
      id: "medium_13",
      options: ["Femoral stress fracture", "Hip flexor strain", "Inguinal hernia", "Osteitis pubis"],
      question: "What is the most likely diagnosis?",
      body_part: "hip",
      rationale: "Osteitis pubis with pubic symphysis pain in athlete.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 13,
      correct_answer: "Osteitis pubis",
      clinical_findings: "Pubic symphysis tenderness, pain with resisted hip adduction and sit-ups.",
      patient_presentation: "27-year-old soccer player with central groin pain, worse with kicking and running."
    },
    {
      id: "medium_14",
      options: ["Ulnar nerve entrapment", "Median nerve entrapment", "Radial nerve entrapment", "Brachial plexus injury"],
      question: "What nerve is most likely affected?",
      body_part: "elbow",
      rationale: "Ulnar nerve entrapment at cubital tunnel with classic symptoms.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 14,
      correct_answer: "Ulnar nerve entrapment",
      clinical_findings: "Numbness in 4th and 5th fingers, positive Tinel's sign at elbow, weak grip.",
      patient_presentation: "35-year-old office worker with numbness in little finger and weakness in grip strength."
    },
    {
      id: "medium_15",
      options: ["Ankle sprain", "High ankle sprain (syndesmosis)", "Ankle fracture", "Peroneal tendon dislocation"],
      question: "What type of ankle injury is most likely?",
      body_part: "ankle",
      rationale: "High ankle sprain with syndesmosis involvement and specific mechanism.",
      difficulty: "medium",
      time_limit: 10,
      case_number: 15,
      correct_answer: "High ankle sprain (syndesmosis)",
      clinical_findings: "Pain above ankle joint, positive squeeze test, external rotation test positive.",
      patient_presentation: "24-year-old footballer with ankle injury during tackle, pain above the ankle joint."
    }
  ];

  // Round 3 - Hard Questions (15 questions, 10 seconds each)
  const hardQuestions: LightningDiagnosisCase[] = [
    {
      id: "hard_1",
      options: ["Cubital tunnel syndrome", "Ulnar tunnel syndrome (Guyon's canal)", "C8-T1 radiculopathy", "Thoracic outlet syndrome"],
      question: "What is the most likely location of pathology?",
      body_part: "hand",
      rationale: "Negative Tinel's at elbow with ulnar distribution symptoms suggests distal ulnar compression.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 1,
      correct_answer: "Ulnar tunnel syndrome (Guyon's canal)",
      clinical_findings: "Intrinsic hand muscle atrophy, positive Froment's sign, sensory loss in ulnar distribution, negative Tinel's at elbow.",
      patient_presentation: "67-year-old with insidious onset hand weakness, difficulty with fine motor tasks, and muscle wasting in the hand."
    },
    {
      id: "hard_2",
      options: ["Femoral stress fracture", "Acetabular labral tear", "Avascular necrosis of femoral head", "Hip joint effusion only"],
      question: "What advanced imaging finding would you expect?",
      body_part: "hip",
      rationale: "Mechanical symptoms with positive impingement tests suggest labral pathology in young athlete.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 2,
      correct_answer: "Acetabular labral tear",
      clinical_findings: "Positive FADIR test, positive FABER test, groin pain with hip flexion, normal plain radiographs.",
      patient_presentation: "34-year-old dancer with deep hip pain and mechanical symptoms including clicking and occasional locking."
    },
    {
      id: "hard_3",
      options: ["Subscapularis", "Supraspinatus", "Infraspinatus", "Teres minor"],
      question: "Which tendon is most likely involved in a full-thickness tear?",
      body_part: "shoulder",
      rationale: "Positive drop arm test and overhead weakness pattern most commonly indicate supraspinatus tear.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 3,
      correct_answer: "Supraspinatus",
      clinical_findings: "Positive drop arm test, weakness in external rotation >45°, intact painful arc, MRI shows full-thickness tear.",
      patient_presentation: "45-year-old with progressive shoulder weakness, particularly in overhead activities, with night pain."
    },
    {
      id: "hard_4",
      options: ["Achilles tendinopathy", "Posterior ankle impingement", "Peroneal tendon tear", "Subtalar joint instability"],
      question: "What secondary pathology should be suspected?",
      body_part: "ankle",
      rationale: "Deep posterior pain with forced plantarflexion in chronic instability suggests posterior impingement.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 4,
      correct_answer: "Posterior ankle impingement",
      clinical_findings: "Positive posterior drawer test, pain with forced plantarflexion, tenderness in posterolateral gutter.",
      patient_presentation: "23-year-old gymnast with chronic ankle instability and deep posterior ankle pain during plantarflexion."
    },
    {
      id: "hard_5",
      options: ["Cervical radiculopathy", "Cervical myelopathy", "Peripheral neuropathy", "Multiple sclerosis"],
      question: "What is the most serious concern?",
      body_part: "neck",
      rationale: "Upper motor neuron signs with gait and bladder issues indicate cervical myelopathy - urgent referral needed.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 5,
      correct_answer: "Cervical myelopathy",
      clinical_findings: "Hyperreflexia, positive Hoffman's sign, inverted radial reflex, wide-based gait, bladder dysfunction.",
      patient_presentation: "58-year-old with chronic neck pain, bilateral arm symptoms, and progressive hand weakness with gait instability."
    },
    {
      id: "hard_6",
      options: ["Lumbar disc herniation", "Cauda equina syndrome", "Spinal stenosis", "Piriformis syndrome"],
      question: "What is the most urgent diagnosis to rule out?",
      body_part: "back",
      rationale: "Bilateral symptoms with bladder dysfunction suggest cauda equina syndrome - surgical emergency.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 6,
      correct_answer: "Cauda equina syndrome",
      clinical_findings: "Bilateral leg weakness, saddle anesthesia, bladder retention, reduced anal tone.",
      patient_presentation: "45-year-old with severe back pain, bilateral leg numbness, and difficulty with urination."
    },
    {
      id: "hard_7",
      options: ["SLAP tear", "Bankart lesion", "Hill-Sachs lesion", "Reverse Hill-Sachs lesion"],
      question: "What labral pathology is most likely?",
      body_part: "shoulder",
      rationale: "SLAP tear with biceps involvement and overhead athlete presentation.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 7,
      correct_answer: "SLAP tear",
      clinical_findings: "Positive O'Brien's test, positive biceps load test, pain with overhead activities.",
      patient_presentation: "26-year-old baseball pitcher with deep shoulder pain and mechanical symptoms during throwing."
    },
    {
      id: "hard_8",
      options: ["Medial tibial stress fracture", "Jones fracture", "Lisfranc injury", "Navicular stress fracture"],
      question: "What stress fracture is most likely?",
      body_part: "foot",
      rationale: "Navicular stress fracture with insidious onset and N-spot tenderness in athlete.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 8,
      correct_answer: "Navicular stress fracture",
      clinical_findings: "N-spot tenderness, pain with hopping, normal x-rays initially.",
      patient_presentation: "22-year-old distance runner with insidious onset midfoot pain, worse with running."
    },
    {
      id: "hard_9",
      options: ["Triangular fibrocartilage complex tear", "Scapholunate ligament injury", "Kienbock's disease", "Carpal instability"],
      question: "What wrist pathology is most likely?",
      body_part: "wrist",
      rationale: "TFCC tear with ulnar-sided wrist pain and positive provocation tests.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 9,
      correct_answer: "Triangular fibrocartilage complex tear",
      clinical_findings: "Ulnar-sided wrist pain, positive TFCC compression test, pain with forearm rotation.",
      patient_presentation: "28-year-old gymnast with ulnar-sided wrist pain after fall on extended wrist."
    },
    {
      id: "hard_10",
      options: ["Femoroacetabular impingement", "Developmental dysplasia", "Acetabular retroversion", "Coxa profunda"],
      question: "What hip morphology is most likely?",
      body_part: "hip",
      rationale: "FAI with characteristic presentation and positive impingement tests in young athlete.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 10,
      correct_answer: "Femoroacetabular impingement",
      clinical_findings: "Positive FADIR test, groin pain with hip flexion and internal rotation, limited hip ROM.",
      patient_presentation: "24-year-old athlete with deep groin pain and stiffness, worse with deep hip flexion."
    },
    {
      id: "hard_11",
      options: ["Thoracic outlet syndrome", "Cervical rib syndrome", "Scalene muscle syndrome", "Pectoralis minor syndrome"],
      question: "What specific TOS variant is most likely?",
      body_part: "neck",
      rationale: "Neurogenic TOS with specific nerve compression symptoms and provocative tests.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 11,
      correct_answer: "Scalene muscle syndrome",
      clinical_findings: "Positive Adson's test, numbness in C8-T1 distribution, weak intrinsic hand muscles.",
      patient_presentation: "35-year-old violinist with arm numbness and weakness, worse with overhead positioning."
    },
    {
      id: "hard_12",
      options: ["Posterior tibialis dysfunction", "Tarsal coalition", "Accessory navicular syndrome", "Spring ligament rupture"],
      question: "What foot deformity cause is most likely?",
      body_part: "foot",
      rationale: "Posterior tibialis dysfunction with acquired flatfoot and characteristic findings.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 12,
      correct_answer: "Posterior tibialis dysfunction",
      clinical_findings: "Acquired flatfoot, inability to perform single heel rise, 'too many toes' sign.",
      patient_presentation: "52-year-old with progressive flatfoot deformity and medial ankle pain."
    },
    {
      id: "hard_13",
      options: ["Quadrilateral space syndrome", "Suprascapular nerve entrapment", "Axillary nerve injury", "Long thoracic nerve palsy"],
      question: "What nerve entrapment is most likely?",
      body_part: "shoulder",
      rationale: "Suprascapular nerve entrapment with specific muscle weakness pattern.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 13,
      correct_answer: "Suprascapular nerve entrapment",
      clinical_findings: "Weakness in external rotation and shoulder abduction, supraspinatus and infraspinatus atrophy.",
      patient_presentation: "40-year-old volleyball player with posterior shoulder pain and weakness in overhead activities."
    },
    {
      id: "hard_14",
      options: ["Medial epicondyle avulsion", "UCL tear", "Posteromedial impingement", "Olecranon stress fracture"],
      question: "What elbow pathology is most likely in this pitcher?",
      body_part: "elbow",
      rationale: "UCL tear with classic presentation in overhead athlete with medial elbow pain.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 14,
      correct_answer: "UCL tear",
      clinical_findings: "Positive milking maneuver, medial elbow pain with valgus stress, decreased throwing velocity.",
      patient_presentation: "22-year-old baseball pitcher with medial elbow pain and decreased throwing velocity."
    },
    {
      id: "hard_15",
      options: ["Lumbar facet syndrome", "Sacroiliac joint dysfunction", "Piriformis syndrome", "Coccydynia"],
      question: "What is the most likely source of referred pain?",
      body_part: "back",
      rationale: "SI joint dysfunction with characteristic pain pattern and positive provocative tests.",
      difficulty: "hard",
      time_limit: 10,
      case_number: 15,
      correct_answer: "Sacroiliac joint dysfunction",
      clinical_findings: "Positive FABER test, positive Gaenslen's test, unilateral lower back and buttock pain.",
      patient_presentation: "38-year-old postpartum woman with unilateral lower back and buttock pain, worse with sitting."
    }
  ];

  // Combine all questions
  const allCases = [...easyQuestions, ...mediumQuestions, ...hardQuestions];

  // Create the comprehensive tournament content
  const tournamentContent = {
    lightning_diagnosis: {
      cases: allCases,
      rounds: {
        round_1: {
          questions: easyQuestions.map(q => q.id),
          difficulty: "easy",
          description: "Round 1 - Basic Diagnostic Skills",
          time_limit_per_question: 10
        },
        round_2: {
          questions: mediumQuestions.map(q => q.id),
          difficulty: "medium", 
          description: "Round 2 - Intermediate Clinical Reasoning",
          time_limit_per_question: 10
        },
        round_3: {
          questions: hardQuestions.map(q => q.id),
          difficulty: "hard",
          description: "Round 3 - Advanced Diagnostic Challenges", 
          time_limit_per_question: 10
        }
      },
      tournament_format: {
        total_questions: 45,
        elimination_style: true,
        real_time_scoring: true,
        progressive_difficulty: true,
        questions_per_round: 15,
        time_per_question: 10
      }
    }
  };

  // Update the existing tournament content
  try {
    await db
      .update(gameContent)
      .set({ 
        content: tournamentContent as any
      })
      .where(eq(gameContent.id, 103));

    console.log('✅ Tournament content updated successfully!');
    console.log(`Generated ${allCases.length} total questions:`);
    console.log(`- Round 1 (Easy): ${easyQuestions.length} questions`);
    console.log(`- Round 2 (Medium): ${mediumQuestions.length} questions`);
    console.log(`- Round 3 (Hard): ${hardQuestions.length} questions`);
    console.log('⏱️  All questions set to 10 seconds per question');
    
    return tournamentContent;
  } catch (error) {
    console.error('❌ Error updating tournament content:', error);
    throw error;
  }
}

// Run the content generation
if (require.main === module) {
  generateComprehensiveTournamentContent()
    .then(() => {
      console.log('Tournament content generation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to generate tournament content:', error);
      process.exit(1);
    });
}