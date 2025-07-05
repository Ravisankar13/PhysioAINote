#!/usr/bin/env tsx

/**
 * Script to generate comprehensive body-part-specific Lightning Diagnosis content
 * Creates 20 questions for each body part competition
 */

import { db } from '../db.js';
import { gameContent } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

interface CompetitionData {
  id: number;
  title: string;
  bodyPart: string;
}

const competitions: CompetitionData[] = [
  { id: 41, title: "Lightning Diagnosis: Shoulder Pain Challenge", bodyPart: "shoulder" },
  { id: 42, title: "Lightning Diagnosis: Knee Pain Sprint", bodyPart: "knee" },
  { id: 43, title: "Lightning Diagnosis: Back Pain Blitz", bodyPart: "back" },
  { id: 44, title: "Lightning Diagnosis: Neck Pain Express", bodyPart: "neck" },
  { id: 45, title: "Lightning Diagnosis: Hip Pain Rush", bodyPart: "hip" },
  { id: 53, title: "Lightning Diagnosis: Wrist Pain Express", bodyPart: "wrist" },
  { id: 54, title: "Lightning Diagnosis: Foot Pain Sprint", bodyPart: "foot" },
  { id: 55, title: "Lightning Diagnosis: Elbow Pain Challenge", bodyPart: "elbow" },
  { id: 56, title: "Lightning Diagnosis: Cervical Spine Rush", bodyPart: "neck" },
  { id: 57, title: "Lightning Diagnosis: Hand Pain Blitz", bodyPart: "hand" },
  { id: 58, title: "Lightning Diagnosis: Thoracic Spine Challenge", bodyPart: "back" },
  { id: 59, title: "Lightning Diagnosis: Hip Pathology Express", bodyPart: "hip" },
  { id: 61, title: "Lightning Diagnosis: Lumbar Spine Blitz", bodyPart: "back" },
  { id: 62, title: "Lightning Diagnosis: Sports Injury Express", bodyPart: "general" },
  { id: 84, title: "Lightning Diagnosis Challenge", bodyPart: "general" }
];

// Note: Competition 60 (Ankle Trauma Sprint) already has correct content

const generateShoulderQuestions = () => [
  {
    id: "shoulder_001",
    timeLimit: 30,
    presentation: "45-year-old office worker with gradual onset shoulder pain, difficulty reaching overhead, painful arc at 60-120°",
    correctDiagnosis: "Subacromial impingement syndrome",
    redHerrings: ["Rotator cuff tear", "Adhesive capsulitis", "AC joint arthritis"]
  },
  {
    id: "shoulder_002",
    timeLimit: 30,
    presentation: "52-year-old tennis player with sudden sharp shoulder pain during serve, weakness in external rotation",
    correctDiagnosis: "Rotator cuff tear",
    redHerrings: ["Subacromial impingement", "Labral tear", "Biceps tendinopathy"]
  },
  {
    id: "shoulder_003",
    timeLimit: 30,
    presentation: "38-year-old develops gradual shoulder stiffness, loss of external rotation and abduction, night pain",
    correctDiagnosis: "Adhesive capsulitis (frozen shoulder)",
    redHerrings: ["Rotator cuff tear", "Osteoarthritis", "Subacromial impingement"]
  },
  {
    id: "shoulder_004",
    timeLimit: 30,
    presentation: "25-year-old volleyball player with anterior shoulder pain, positive apprehension test",
    correctDiagnosis: "Anterior shoulder instability",
    redHerrings: ["Labral tear", "Rotator cuff strain", "AC joint sprain"]
  },
  {
    id: "shoulder_005",
    timeLimit: 30,
    presentation: "42-year-old with shoulder pain at AC joint, positive cross-body adduction test",
    correctDiagnosis: "AC joint arthritis",
    redHerrings: ["Subacromial impingement", "Rotator cuff tear", "Biceps tendinopathy"]
  },
  {
    id: "shoulder_006",
    timeLimit: 30,
    presentation: "30-year-old pitcher with deep shoulder pain, positive O'Brien's test, clicking sensation",
    correctDiagnosis: "SLAP tear (labral tear)",
    redHerrings: ["Rotator cuff tear", "Biceps tendinopathy", "Posterior impingement"]
  },
  {
    id: "shoulder_007",
    timeLimit: 30,
    presentation: "28-year-old swimmer with anterior shoulder pain, tenderness in bicipital groove",
    correctDiagnosis: "Biceps tendinopathy",
    redHerrings: ["Subacromial impingement", "Labral tear", "Subscapularis tear"]
  },
  {
    id: "shoulder_008",
    timeLimit: 30,
    presentation: "55-year-old with shoulder pain, weakness lifting arm, positive lag signs",
    correctDiagnosis: "Massive rotator cuff tear",
    redHerrings: ["Subacromial impingement", "Adhesive capsulitis", "Deltoid strain"]
  },
  {
    id: "shoulder_009",
    timeLimit: 30,
    presentation: "22-year-old rugby player with posterior shoulder pain after dislocation, positive Kim test",
    correctDiagnosis: "Posterior labral tear",
    redHerrings: ["Posterior capsule tightness", "Infraspinatus strain", "Rhomboid strain"]
  },
  {
    id: "shoulder_010",
    timeLimit: 30,
    presentation: "48-year-old with shoulder pain, joint space narrowing on X-ray, morning stiffness",
    correctDiagnosis: "Glenohumeral osteoarthritis",
    redHerrings: ["Rotator cuff arthropathy", "Adhesive capsulitis", "Subacromial impingement"]
  },
  {
    id: "shoulder_011",
    timeLimit: 30,
    presentation: "35-year-old swimmer with shoulder pain during backstroke, positive Neer's test",
    correctDiagnosis: "Swimmer's shoulder (impingement)",
    redHerrings: ["Rotator cuff tear", "Thoracic outlet syndrome", "Scapular dyskinesis"]
  },
  {
    id: "shoulder_012",
    timeLimit: 30,
    presentation: "26-year-old weightlifter with anterior shoulder pain, positive Speed's test",
    correctDiagnosis: "Biceps tendon subluxation",
    redHerrings: ["Biceps tendinopathy", "Subscapularis tear", "Anterior instability"]
  },
  {
    id: "shoulder_013",
    timeLimit: 30,
    presentation: "40-year-old with shoulder pain and weakness, positive belly-press test",
    correctDiagnosis: "Subscapularis tear",
    redHerrings: ["Supraspinatus tear", "Anterior capsule tear", "Biceps tendinopathy"]
  },
  {
    id: "shoulder_014",
    timeLimit: 30,
    presentation: "32-year-old baseball pitcher with shoulder pain in late cocking phase, internal impingement",
    correctDiagnosis: "Posterior superior impingement",
    redHerrings: ["SLAP tear", "Posterior capsule tightness", "Subacromial impingement"]
  },
  {
    id: "shoulder_015",
    timeLimit: 30,
    presentation: "29-year-old with shoulder pain, scapular winging, weakness with protraction",
    correctDiagnosis: "Serratus anterior weakness",
    redHerrings: ["Long thoracic nerve palsy", "Rhomboid weakness", "Trapezius strain"]
  },
  {
    id: "shoulder_016",
    timeLimit: 30,
    presentation: "50-year-old with shoulder pain, positive Hawkins test, night pain",
    correctDiagnosis: "Subacromial bursitis",
    redHerrings: ["Rotator cuff tendinopathy", "AC joint arthritis", "Adhesive capsulitis"]
  },
  {
    id: "shoulder_017",
    timeLimit: 30,
    presentation: "24-year-old gymnast with shoulder pain during overhead activities, positive sulcus sign",
    correctDiagnosis: "Multidirectional instability",
    redHerrings: ["Anterior instability", "Labral tear", "Rotator cuff weakness"]
  },
  {
    id: "shoulder_018",
    timeLimit: 30,
    presentation: "36-year-old with shoulder pain after fall, inability to initiate abduction",
    correctDiagnosis: "Supraspinatus tear",
    redHerrings: ["Deltoid strain", "Axillary nerve injury", "Subacromial impingement"]
  },
  {
    id: "shoulder_019",
    timeLimit: 30,
    presentation: "44-year-old with gradual shoulder pain, weakness in external rotation, positive external rotation lag",
    correctDiagnosis: "Infraspinatus tear",
    redHerrings: ["Posterior capsule tightness", "Supraspinatus tear", "Rhomboid weakness"]
  },
  {
    id: "shoulder_020",
    timeLimit: 30,
    presentation: "31-year-old overhead athlete with shoulder pain, positive scapular dyskinesis",
    correctDiagnosis: "Scapular dyskinesis",
    redHerrings: ["Serratus anterior weakness", "Trapezius strain", "Thoracic outlet syndrome"]
  }
];

const generateKneeQuestions = () => [
  {
    id: "knee_001",
    timeLimit: 30,
    presentation: "22-year-old soccer player with knee giving way, positive anterior drawer test",
    correctDiagnosis: "ACL rupture",
    redHerrings: ["MCL tear", "Meniscal tear", "PCL injury"]
  },
  {
    id: "knee_002",
    timeLimit: 30,
    presentation: "28-year-old runner with medial knee pain, positive McMurray test",
    correctDiagnosis: "Medial meniscus tear",
    redHerrings: ["MCL sprain", "Pes anserine bursitis", "Medial plica syndrome"]
  },
  {
    id: "knee_003",
    timeLimit: 30,
    presentation: "45-year-old with gradual knee pain, morning stiffness, joint space narrowing",
    correctDiagnosis: "Knee osteoarthritis",
    redHerrings: ["Rheumatoid arthritis", "Meniscal tear", "Patellofemoral pain"]
  },
  {
    id: "knee_004",
    timeLimit: 30,
    presentation: "19-year-old female runner with anterior knee pain, worse going downstairs",
    correctDiagnosis: "Patellofemoral pain syndrome",
    redHerrings: ["Patellar tendinopathy", "Osgood-Schlatter disease", "Plica syndrome"]
  },
  {
    id: "knee_005",
    timeLimit: 30,
    presentation: "25-year-old basketball player with medial knee pain after valgus stress",
    correctDiagnosis: "MCL sprain",
    redHerrings: ["ACL tear", "Medial meniscus tear", "Pes anserine bursitis"]
  },
  {
    id: "knee_006",
    timeLimit: 30,
    presentation: "16-year-old volleyball player with inferior patellar pain, tender tibial tuberosity",
    correctDiagnosis: "Osgood-Schlatter disease",
    redHerrings: ["Patellar tendinopathy", "Sinding-Larsen-Johansson disease", "Patellofemoral pain"]
  },
  {
    id: "knee_007",
    timeLimit: 30,
    presentation: "30-year-old jumper with inferior patellar pain, thickened patellar tendon",
    correctDiagnosis: "Patellar tendinopathy (jumper's knee)",
    redHerrings: ["Osgood-Schlatter disease", "Patellofemoral pain", "Quadriceps tendinopathy"]
  },
  {
    id: "knee_008",
    timeLimit: 30,
    presentation: "35-year-old with posterior knee pain, positive posterior drawer test",
    correctDiagnosis: "PCL injury",
    redHerrings: ["ACL tear", "Posterior horn meniscal tear", "Baker's cyst"]
  },
  {
    id: "knee_009",
    timeLimit: 30,
    presentation: "42-year-old with lateral knee pain, positive Ober test, ITB tightness",
    correctDiagnosis: "Iliotibial band syndrome",
    redHerrings: ["Lateral meniscus tear", "LCL sprain", "Biceps femoris strain"]
  },
  {
    id: "knee_010",
    timeLimit: 30,
    presentation: "24-year-old with knee swelling, fluctuant mass in popliteal fossa",
    correctDiagnosis: "Baker's cyst",
    redHerrings: ["Popliteal artery aneurysm", "DVT", "Gastrocnemius strain"]
  },
  {
    id: "knee_011",
    timeLimit: 30,
    presentation: "20-year-old with knee clicking, catching sensation, positive pivot shift",
    correctDiagnosis: "ACL deficiency with rotatory instability",
    redHerrings: ["Meniscal tear", "Loose body", "Plica syndrome"]
  },
  {
    id: "knee_012",
    timeLimit: 30,
    presentation: "38-year-old with medial knee pain, tender over pes anserine insertion",
    correctDiagnosis: "Pes anserine bursitis",
    redHerrings: ["MCL sprain", "Medial meniscus tear", "Saphenous nerve entrapment"]
  },
  {
    id: "knee_013",
    timeLimit: 30,
    presentation: "26-year-old with lateral knee pain, positive varus stress test",
    correctDiagnosis: "LCL sprain",
    redHerrings: ["Lateral meniscus tear", "ITB syndrome", "Biceps femoris strain"]
  },
  {
    id: "knee_014",
    timeLimit: 30,
    presentation: "32-year-old with knee pain and clicking, loose body visible on X-ray",
    correctDiagnosis: "Loose body in knee",
    redHerrings: ["Meniscal tear", "Plica syndrome", "Osteochondritis dissecans"]
  },
  {
    id: "knee_015",
    timeLimit: 30,
    presentation: "15-year-old athlete with knee pain, osteochondral defect on MRI",
    correctDiagnosis: "Osteochondritis dissecans",
    redHerrings: ["Osgood-Schlatter disease", "Patellar dislocation", "Meniscal tear"]
  },
  {
    id: "knee_016",
    timeLimit: 30,
    presentation: "27-year-old with anterior knee pain, positive J-sign, lateral patellar tracking",
    correctDiagnosis: "Patellar maltracking",
    redHerrings: ["Patellofemoral pain", "Patellar tendinopathy", "VMO weakness"]
  },
  {
    id: "knee_017",
    timeLimit: 30,
    presentation: "34-year-old with medial knee pain, snapping sensation, visible band",
    correctDiagnosis: "Medial plica syndrome",
    redHerrings: ["Medial meniscus tear", "MCL sprain", "Pes anserine bursitis"]
  },
  {
    id: "knee_018",
    timeLimit: 30,
    presentation: "29-year-old with knee pain, swelling, warmth, elevated ESR",
    correctDiagnosis: "Septic arthritis",
    redHerrings: ["Rheumatoid arthritis", "Gout", "Reactive arthritis"]
  },
  {
    id: "knee_019",
    timeLimit: 30,
    presentation: "23-year-old dancer with knee pain, positive apprehension test for patella",
    correctDiagnosis: "Patellar instability",
    redHerrings: ["Patellofemoral pain", "Patellar tendinopathy", "Plica syndrome"]
  },
  {
    id: "knee_020",
    timeLimit: 30,
    presentation: "41-year-old with knee pain, crepitus, positive patellar grind test",
    correctDiagnosis: "Patellofemoral arthritis",
    redHerrings: ["Patellofemoral pain", "Chondromalacia patellae", "Patellar tendinopathy"]
  }
];

const generateBackQuestions = () => [
  {
    id: "back_001",
    timeLimit: 30,
    presentation: "35-year-old with acute low back pain after lifting, positive straight leg raise",
    correctDiagnosis: "Lumbar disc herniation",
    redHerrings: ["Muscle strain", "Facet joint syndrome", "Piriformis syndrome"]
  },
  {
    id: "back_002",
    timeLimit: 30,
    presentation: "45-year-old with chronic low back pain, worse with extension, better with flexion",
    correctDiagnosis: "Lumbar spinal stenosis",
    redHerrings: ["Disc herniation", "Facet arthropathy", "Spondylolisthesis"]
  },
  {
    id: "back_003",
    timeLimit: 30,
    presentation: "28-year-old athlete with low back pain, pars defect on X-ray",
    correctDiagnosis: "Spondylolysis",
    redHerrings: ["Spondylolisthesis", "Facet joint syndrome", "Muscle strain"]
  },
  {
    id: "back_004",
    timeLimit: 30,
    presentation: "50-year-old with low back pain, positive facet loading test",
    correctDiagnosis: "Facet joint syndrome",
    redHerrings: ["Disc herniation", "Muscle strain", "SI joint dysfunction"]
  },
  {
    id: "back_005",
    timeLimit: 30,
    presentation: "32-year-old with buttock pain, positive FABER test, positive Gaenslen test",
    correctDiagnosis: "Sacroiliac joint dysfunction",
    redHerrings: ["Piriformis syndrome", "L5-S1 disc herniation", "Gluteal strain"]
  },
  {
    id: "back_006",
    timeLimit: 30,
    presentation: "26-year-old runner with deep buttock pain, positive piriformis test",
    correctDiagnosis: "Piriformis syndrome",
    redHerrings: ["SI joint dysfunction", "Sciatic nerve entrapment", "Hamstring strain"]
  },
  {
    id: "back_007",
    timeLimit: 30,
    presentation: "40-year-old with thoracic pain, rib pain with deep breathing, positive rib spring test",
    correctDiagnosis: "Costotransverse joint dysfunction",
    redHerrings: ["Intercostal strain", "Thoracic disc herniation", "Rib fracture"]
  },
  {
    id: "back_008",
    timeLimit: 30,
    presentation: "55-year-old with thoracic kyphosis, osteoporotic compression fracture",
    correctDiagnosis: "Thoracic compression fracture",
    redHerrings: ["Thoracic disc herniation", "Intercostal neuralgia", "Muscle strain"]
  },
  {
    id: "back_009",
    timeLimit: 30,
    presentation: "22-year-old with thoracic pain, hypomobility, positive spring test",
    correctDiagnosis: "Thoracic hypomobility",
    redHerrings: ["Thoracic disc herniation", "Rib dysfunction", "Intercostal strain"]
  },
  {
    id: "back_010",
    timeLimit: 30,
    presentation: "38-year-old with low back pain radiating to leg, positive slump test",
    correctDiagnosis: "Sciatica",
    redHerrings: ["Piriformis syndrome", "Hamstring strain", "SI joint dysfunction"]
  },
  {
    id: "back_011",
    timeLimit: 30,
    presentation: "42-year-old with low back pain, forward slip of L5 on S1",
    correctDiagnosis: "Spondylolisthesis",
    redHerrings: ["Spondylolysis", "Disc herniation", "Facet arthropathy"]
  },
  {
    id: "back_012",
    timeLimit: 30,
    presentation: "29-year-old with acute torticollis, muscle spasm, limited rotation",
    correctDiagnosis: "Acute torticollis",
    redHerrings: ["Cervical disc herniation", "Facet joint lock", "Muscle strain"]
  },
  {
    id: "back_013",
    timeLimit: 30,
    presentation: "36-year-old with chronic low back pain, positive McKenzie extension preference",
    correctDiagnosis: "Lumbar extension dysfunction",
    redHerrings: ["Disc herniation", "Facet syndrome", "Muscle strain"]
  },
  {
    id: "back_014",
    timeLimit: 30,
    presentation: "48-year-old with low back pain, positive prone instability test",
    correctDiagnosis: "Lumbar instability",
    redHerrings: ["Disc herniation", "Facet syndrome", "Muscle weakness"]
  },
  {
    id: "back_015",
    timeLimit: 30,
    presentation: "33-year-old with thoracic pain between shoulder blades, postural dysfunction",
    correctDiagnosis: "Upper crossed syndrome",
    redHerrings: ["Thoracic disc herniation", "Intercostal strain", "Rib dysfunction"]
  },
  {
    id: "back_016",
    timeLimit: 30,
    presentation: "27-year-old with low back pain, positive hip flexor tightness, anterior pelvic tilt",
    correctDiagnosis: "Lower crossed syndrome",
    redHerrings: ["Hip flexor strain", "Lumbar hyperlordosis", "SI dysfunction"]
  },
  {
    id: "back_017",
    timeLimit: 30,
    presentation: "44-year-old with thoracic pain, intercostal neuralgia, burning sensation",
    correctDiagnosis: "Intercostal neuralgia",
    redHerrings: ["Rib fracture", "Intercostal strain", "Thoracic disc herniation"]
  },
  {
    id: "back_018",
    timeLimit: 30,
    presentation: "39-year-old with low back pain, positive centralization with McKenzie exercises",
    correctDiagnosis: "Derangement syndrome",
    redHerrings: ["Disc herniation", "Facet syndrome", "Dysfunction syndrome"]
  },
  {
    id: "back_019",
    timeLimit: 30,
    presentation: "31-year-old with coccyx pain after fall, tender coccyx on palpation",
    correctDiagnosis: "Coccydynia",
    redHerrings: ["Sacral fracture", "SI joint dysfunction", "Piriformis syndrome"]
  },
  {
    id: "back_020",
    timeLimit: 30,
    presentation: "46-year-old with chronic low back pain, positive fear avoidance beliefs",
    correctDiagnosis: "Chronic pain syndrome",
    redHerrings: ["Disc degeneration", "Facet arthropathy", "Muscle deconditioning"]
  }
];

const generateNeckQuestions = () => [
  {
    id: "neck_001",
    timeLimit: 30,
    presentation: "32-year-old with neck pain and arm numbness, positive Spurling's test",
    correctDiagnosis: "Cervical radiculopathy",
    redHerrings: ["Cervical disc herniation", "Thoracic outlet syndrome", "Cervical strain"]
  },
  {
    id: "neck_002",
    timeLimit: 30,
    presentation: "28-year-old after whiplash injury, neck pain and headaches",
    correctDiagnosis: "Whiplash-associated disorder",
    redHerrings: ["Cervical strain", "Concussion", "Cervical facet syndrome"]
  },
  {
    id: "neck_003",
    timeLimit: 30,
    presentation: "45-year-old with neck pain and occipital headaches, C1-C2 dysfunction",
    correctDiagnosis: "Cervicogenic headache",
    redHerrings: ["Tension headache", "Migraine", "Cluster headache"]
  },
  {
    id: "neck_004",
    timeLimit: 30,
    presentation: "35-year-old office worker with neck pain, forward head posture",
    correctDiagnosis: "Cervical postural syndrome",
    redHerrings: ["Cervical disc degeneration", "Upper crossed syndrome", "Cervical strain"]
  },
  {
    id: "neck_005",
    timeLimit: 30,
    presentation: "40-year-old with neck pain, positive upper limb tension test",
    correctDiagnosis: "Cervical neural tension",
    redHerrings: ["Thoracic outlet syndrome", "Cervical radiculopathy", "Carpal tunnel syndrome"]
  },
  {
    id: "neck_006",
    timeLimit: 30,
    presentation: "26-year-old with neck pain after sudden rotation, locked facet joint",
    correctDiagnosis: "Cervical facet joint syndrome",
    redHerrings: ["Cervical strain", "Torticollis", "Cervical disc herniation"]
  },
  {
    id: "neck_007",
    timeLimit: 30,
    presentation: "52-year-old with neck pain and arm symptoms, positive Adson's test",
    correctDiagnosis: "Thoracic outlet syndrome",
    redHerrings: ["Cervical radiculopathy", "Carpal tunnel syndrome", "Subclavian steal"]
  },
  {
    id: "neck_008",
    timeLimit: 30,
    presentation: "38-year-old with neck pain, muscle spasm, limited range of motion",
    correctDiagnosis: "Cervical muscle strain",
    redHerrings: ["Cervical disc herniation", "Facet syndrome", "Torticollis"]
  },
  {
    id: "neck_009",
    timeLimit: 30,
    presentation: "48-year-old with neck pain and arm weakness, disc protrusion on MRI",
    correctDiagnosis: "Cervical disc herniation",
    redHerrings: ["Cervical radiculopathy", "Cervical myelopathy", "Thoracic outlet syndrome"]
  },
  {
    id: "neck_010",
    timeLimit: 30,
    presentation: "55-year-old with neck pain and hand clumsiness, positive Hoffmann's sign",
    correctDiagnosis: "Cervical myelopathy",
    redHerrings: ["Cervical radiculopathy", "Carpal tunnel syndrome", "Peripheral neuropathy"]
  },
  {
    id: "neck_011",
    timeLimit: 30,
    presentation: "29-year-old with neck pain and dizziness, positive cervical rotation test",
    correctDiagnosis: "Cervical vertigo",
    redHerrings: ["BPPV", "Vestibular neuritis", "Meniere's disease"]
  },
  {
    id: "neck_012",
    timeLimit: 30,
    presentation: "42-year-old with neck pain, tender trigger points in upper trapezius",
    correctDiagnosis: "Myofascial pain syndrome",
    redHerrings: ["Cervical strain", "Fibromyalgia", "Tension headache"]
  },
  {
    id: "neck_013",
    timeLimit: 30,
    presentation: "34-year-old with neck pain and jaw pain, TMJ dysfunction",
    correctDiagnosis: "Cervical-mandibular syndrome",
    redHerrings: ["TMJ disorder", "Trigeminal neuralgia", "Cervical strain"]
  },
  {
    id: "neck_014",
    timeLimit: 30,
    presentation: "46-year-old with neck pain, positive atlantoaxial instability test",
    correctDiagnosis: "Atlantoaxial instability",
    redHerrings: ["Cervical strain", "Occipital neuralgia", "Cervical facet syndrome"]
  },
  {
    id: "neck_015",
    timeLimit: 30,
    presentation: "31-year-old with neck pain and suboccipital headaches, C0-C1 restriction",
    correctDiagnosis: "Occipito-atlantal dysfunction",
    redHerrings: ["Tension headache", "Cervicogenic headache", "Occipital neuralgia"]
  },
  {
    id: "neck_016",
    timeLimit: 30,
    presentation: "37-year-old with neck pain and shoulder blade pain, levator scapulae tightness",
    correctDiagnosis: "Levator scapulae syndrome",
    redHerrings: ["Cervical strain", "Trapezius strain", "Cervical radiculopathy"]
  },
  {
    id: "neck_017",
    timeLimit: 30,
    presentation: "43-year-old with neck pain and temporal headaches, positive cervical flexion-rotation test",
    correctDiagnosis: "C1-C2 dysfunction",
    redHerrings: ["Cervicogenic headache", "Atlantoaxial instability", "Occipital neuralgia"]
  },
  {
    id: "neck_018",
    timeLimit: 30,
    presentation: "39-year-old with neck pain and shooting occipital pain, tender greater occipital nerve",
    correctDiagnosis: "Occipital neuralgia",
    redHerrings: ["Cervicogenic headache", "Tension headache", "Migraine"]
  },
  {
    id: "neck_019",
    timeLimit: 30,
    presentation: "44-year-old with neck pain, positive cranial cervical flexion test weakness",
    correctDiagnosis: "Deep neck flexor weakness",
    redHerrings: ["Cervical postural syndrome", "Upper crossed syndrome", "Cervical strain"]
  },
  {
    id: "neck_020",
    timeLimit: 30,
    presentation: "36-year-old with neck pain and arm symptoms, positive distraction test relief",
    correctDiagnosis: "Cervical compression syndrome",
    redHerrings: ["Cervical radiculopathy", "Thoracic outlet syndrome", "Cervical disc herniation"]
  }
];

const generateHipQuestions = () => [
  {
    id: "hip_001",
    timeLimit: 30,
    presentation: "25-year-old runner with lateral hip pain, positive Trendelenburg test",
    correctDiagnosis: "Gluteus medius weakness",
    redHerrings: ["ITB syndrome", "Trochanteric bursitis", "Hip labral tear"]
  },
  {
    id: "hip_002",
    timeLimit: 30,
    presentation: "35-year-old with groin pain, positive FADIR test, catching sensation",
    correctDiagnosis: "Hip labral tear",
    redHerrings: ["Hip impingement", "Adductor strain", "Hip arthritis"]
  },
  {
    id: "hip_003",
    timeLimit: 30,
    presentation: "28-year-old athlete with deep hip pain, positive FABER test",
    correctDiagnosis: "Femoroacetabular impingement",
    redHerrings: ["Hip labral tear", "Hip arthritis", "Psoas strain"]
  },
  {
    id: "hip_004",
    timeLimit: 30,
    presentation: "45-year-old with lateral hip pain, tender over greater trochanter",
    correctDiagnosis: "Greater trochanteric pain syndrome",
    redHerrings: ["ITB syndrome", "Gluteus medius tear", "Hip arthritis"]
  },
  {
    id: "hip_005",
    timeLimit: 30,
    presentation: "32-year-old dancer with anterior hip pain, positive Thomas test",
    correctDiagnosis: "Hip flexor tightness/strain",
    redHerrings: ["Hip impingement", "Labral tear", "Psoas bursitis"]
  },
  {
    id: "hip_006",
    timeLimit: 30,
    presentation: "22-year-old soccer player with groin pain, tender adductor muscles",
    correctDiagnosis: "Adductor strain",
    redHerrings: ["Hip labral tear", "Sports hernia", "Osteitis pubis"]
  },
  {
    id: "hip_007",
    timeLimit: 30,
    presentation: "40-year-old with hip stiffness, morning pain, joint space narrowing",
    correctDiagnosis: "Hip osteoarthritis",
    redHerrings: ["Hip impingement", "Labral tear", "Avascular necrosis"]
  },
  {
    id: "hip_008",
    timeLimit: 30,
    presentation: "18-year-old with hip pain, positive Patrick test, pubic symphysis tenderness",
    correctDiagnosis: "Osteitis pubis",
    redHerrings: ["Adductor strain", "Sports hernia", "Hip labral tear"]
  },
  {
    id: "hip_009",
    timeLimit: 30,
    presentation: "26-year-old with deep hip pain, snapping sensation, positive Ober test",
    correctDiagnosis: "Snapping hip syndrome",
    redHerrings: ["Hip labral tear", "ITB syndrome", "Hip impingement"]
  },
  {
    id: "hip_010",
    timeLimit: 30,
    presentation: "38-year-old runner with posterior hip pain, positive piriformis test",
    correctDiagnosis: "Piriformis syndrome",
    redHerrings: ["Sciatic nerve entrapment", "Hamstring strain", "SI joint dysfunction"]
  },
  {
    id: "hip_011",
    timeLimit: 30,
    presentation: "42-year-old with groin pain, weakness in adduction, MRI shows muscle tear",
    correctDiagnosis: "Adductor longus tear",
    redHerrings: ["Adductor strain", "Sports hernia", "Hip labral tear"]
  },
  {
    id: "hip_012",
    timeLimit: 30,
    presentation: "29-year-old with anterior hip pain, positive log roll test, night pain",
    correctDiagnosis: "Hip arthritis",
    redHerrings: ["Hip impingement", "Labral tear", "Psoas tendinopathy"]
  },
  {
    id: "hip_013",
    timeLimit: 30,
    presentation: "34-year-old with lateral hip pain, positive single leg stance test",
    correctDiagnosis: "Gluteal tendinopathy",
    redHerrings: ["Trochanteric bursitis", "ITB syndrome", "Gluteus medius strain"]
  },
  {
    id: "hip_014",
    timeLimit: 30,
    presentation: "31-year-old with deep groin pain, positive psoas test, hip flexor tightness",
    correctDiagnosis: "Psoas syndrome",
    redHerrings: ["Hip flexor strain", "Hip impingement", "Labral tear"]
  },
  {
    id: "hip_015",
    timeLimit: 30,
    presentation: "24-year-old athlete with groin pain, positive squeeze test, pubic tenderness",
    correctDiagnosis: "Athletic pubalgia (sports hernia)",
    redHerrings: ["Adductor strain", "Osteitis pubis", "Inguinal hernia"]
  },
  {
    id: "hip_016",
    timeLimit: 30,
    presentation: "36-year-old with hip pain, avascular necrosis on MRI, history of steroid use",
    correctDiagnosis: "Avascular necrosis of femoral head",
    redHerrings: ["Hip arthritis", "Hip impingement", "Labral tear"]
  },
  {
    id: "hip_017",
    timeLimit: 30,
    presentation: "27-year-old dancer with hip pain, positive McCarthy test, clicking",
    correctDiagnosis: "Hip labral tear with instability",
    redHerrings: ["Hip impingement", "Snapping hip", "Hip dysplasia"]
  },
  {
    id: "hip_018",
    timeLimit: 30,
    presentation: "33-year-old with hip pain, positive Craig test, increased femoral anteversion",
    correctDiagnosis: "Femoral anteversion",
    redHerrings: ["Hip impingement", "Hip dysplasia", "Labral tear"]
  },
  {
    id: "hip_019",
    timeLimit: 30,
    presentation: "39-year-old with hip pain, positive impingement test, cam morphology",
    correctDiagnosis: "Cam-type FAI",
    redHerrings: ["Pincer-type FAI", "Hip arthritis", "Labral tear"]
  },
  {
    id: "hip_020",
    timeLimit: 30,
    presentation: "41-year-old with hip pain, acetabular overcoverage, pincer morphology",
    correctDiagnosis: "Pincer-type FAI",
    redHerrings: ["Cam-type FAI", "Hip dysplasia", "Labral tear"]
  }
];

const generateGeneralQuestions = () => [
  {
    id: "general_001",
    timeLimit: 30,
    presentation: "24-year-old basketball player with acute ankle injury, swelling, unable to bear weight",
    correctDiagnosis: "Ankle sprain (Grade II-III)",
    redHerrings: ["Ankle fracture", "Achilles strain", "Peroneal tendon injury"]
  },
  {
    id: "general_002",
    timeLimit: 30,
    presentation: "32-year-old runner with gradual onset shin pain, worse with activity",
    correctDiagnosis: "Medial tibial stress syndrome",
    redHerrings: ["Stress fracture", "Compartment syndrome", "Muscle strain"]
  },
  {
    id: "general_003",
    timeLimit: 30,
    presentation: "28-year-old tennis player with lateral elbow pain, tender over lateral epicondyle",
    correctDiagnosis: "Lateral epicondylitis",
    redHerrings: ["Radial tunnel syndrome", "Posterior interosseous nerve syndrome", "Elbow arthritis"]
  },
  {
    id: "general_004",
    timeLimit: 30,
    presentation: "35-year-old office worker with wrist pain, numbness in thumb and fingers",
    correctDiagnosis: "Carpal tunnel syndrome",
    redHerrings: ["De Quervain's tenosynovitis", "Ulnar nerve entrapment", "Cervical radiculopathy"]
  },
  {
    id: "general_005",
    timeLimit: 30,
    presentation: "42-year-old with heel pain, worst in morning, tender plantar medial calcaneus",
    correctDiagnosis: "Plantar fasciitis",
    redHerrings: ["Heel spur", "Calcaneal stress fracture", "Tarsal tunnel syndrome"]
  },
  {
    id: "general_006",
    timeLimit: 30,
    presentation: "26-year-old swimmer with shoulder pain, positive impingement tests",
    correctDiagnosis: "Subacromial impingement",
    redHerrings: ["Rotator cuff tear", "Labral tear", "Biceps tendinopathy"]
  },
  {
    id: "general_007",
    timeLimit: 30,
    presentation: "19-year-old volleyball player with knee pain, positive anterior drawer",
    correctDiagnosis: "ACL injury",
    redHerrings: ["MCL sprain", "Meniscal tear", "PCL injury"]
  },
  {
    id: "general_008",
    timeLimit: 30,
    presentation: "38-year-old with low back pain radiating to leg, positive straight leg raise",
    correctDiagnosis: "Lumbar disc herniation",
    redHerrings: ["Piriformis syndrome", "SI joint dysfunction", "Muscle strain"]
  },
  {
    id: "general_009",
    timeLimit: 30,
    presentation: "30-year-old cyclist with neck pain and arm numbness, positive Spurling's test",
    correctDiagnosis: "Cervical radiculopathy",
    redHerrings: ["Thoracic outlet syndrome", "Carpal tunnel syndrome", "Cervical strain"]
  },
  {
    id: "general_010",
    timeLimit: 30,
    presentation: "45-year-old golfer with medial elbow pain, tender over medial epicondyle",
    correctDiagnosis: "Medial epicondylitis",
    redHerrings: ["Ulnar nerve entrapment", "UCL injury", "Flexor tendon strain"]
  },
  {
    id: "general_011",
    timeLimit: 30,
    presentation: "22-year-old runner with lateral hip pain, positive Trendelenburg test",
    correctDiagnosis: "Gluteus medius weakness",
    redHerrings: ["ITB syndrome", "Trochanteric bursitis", "Hip labral tear"]
  },
  {
    id: "general_012",
    timeLimit: 30,
    presentation: "33-year-old with thumb pain, positive Finkelstein's test",
    correctDiagnosis: "De Quervain's tenosynovitis",
    redHerrings: ["Thumb arthritis", "Scaphoid fracture", "Radial nerve irritation"]
  },
  {
    id: "general_013",
    timeLimit: 30,
    presentation: "27-year-old dancer with ankle pain, positive Thompson test",
    correctDiagnosis: "Achilles tendon rupture",
    redHerrings: ["Achilles tendinopathy", "Calf strain", "Ankle sprain"]
  },
  {
    id: "general_014",
    timeLimit: 30,
    presentation: "36-year-old with forefoot pain, numbness between toes, positive Mulder's click",
    correctDiagnosis: "Morton's neuroma",
    redHerrings: ["Metatarsalgia", "Stress fracture", "Interdigital bursitis"]
  },
  {
    id: "general_015",
    timeLimit: 30,
    presentation: "41-year-old with groin pain, positive FADIR test, clicking sensation",
    correctDiagnosis: "Hip labral tear",
    redHerrings: ["Hip impingement", "Adductor strain", "Hip arthritis"]
  },
  {
    id: "general_016",
    timeLimit: 30,
    presentation: "29-year-old with calf pain, positive Homan's sign, recent surgery",
    correctDiagnosis: "Deep vein thrombosis",
    redHerrings: ["Calf strain", "Achilles tendinopathy", "Compartment syndrome"]
  },
  {
    id: "general_017",
    timeLimit: 30,
    presentation: "34-year-old with sudden severe headache, neck stiffness, photophobia",
    correctDiagnosis: "Subarachnoid hemorrhage",
    redHerrings: ["Migraine", "Tension headache", "Cervicogenic headache"]
  },
  {
    id: "general_018",
    timeLimit: 30,
    presentation: "25-year-old with chest pain, shortness of breath after long flight",
    correctDiagnosis: "Pulmonary embolism",
    redHerrings: ["Pneumonia", "Costochondritis", "Anxiety attack"]
  },
  {
    id: "general_019",
    timeLimit: 30,
    presentation: "52-year-old with crushing chest pain radiating to arm, sweating",
    correctDiagnosis: "Myocardial infarction",
    redHerrings: ["Angina", "Costochondritis", "GERD"]
  },
  {
    id: "general_020",
    timeLimit: 30,
    presentation: "48-year-old with severe abdominal pain, rebound tenderness, McBurney's point",
    correctDiagnosis: "Appendicitis",
    redHerrings: ["Gastroenteritis", "Kidney stones", "Ovarian cyst"]
  }
];

// Additional body part specific question generators
const generateWristQuestions = () => [
  {
    id: "wrist_001",
    timeLimit: 30,
    presentation: "25-year-old office worker with wrist pain, numbness in thumb/index finger, worse at night",
    correctDiagnosis: "Carpal tunnel syndrome",
    redHerrings: ["De Quervain's tenosynovitis", "Wrist arthritis", "Ulnar nerve entrapment"]
  },
  {
    id: "wrist_002",
    timeLimit: 30,
    presentation: "30-year-old athlete with thumb-side wrist pain after fall, tender anatomical snuffbox",
    correctDiagnosis: "Scaphoid fracture",
    redHerrings: ["De Quervain's tenosynovitis", "Wrist sprain", "Radial styloid fracture"]
  },
  {
    id: "wrist_003",
    timeLimit: 30,
    presentation: "35-year-old new mother with thumb pain during lifting, positive Finkelstein's test",
    correctDiagnosis: "De Quervain's tenosynovitis",
    redHerrings: ["Carpal tunnel syndrome", "Thumb arthritis", "Radial nerve irritation"]
  },
  {
    id: "wrist_004",
    timeLimit: 30,
    presentation: "50-year-old with gradual wrist stiffness, morning pain, joint swelling",
    correctDiagnosis: "Wrist arthritis",
    redHerrings: ["Carpal tunnel syndrome", "Tendinitis", "Ganglion cyst"]
  },
  {
    id: "wrist_005",
    timeLimit: 30,
    presentation: "22-year-old gymnast with ulnar-sided wrist pain during weight-bearing, clicking",
    correctDiagnosis: "TFCC tear",
    redHerrings: ["Ulnar nerve entrapment", "Wrist sprain", "Ulnar styloid fracture"]
  },
  {
    id: "wrist_006",
    timeLimit: 30,
    presentation: "40-year-old with weakness gripping, numbness in pinky, positive Tinel's at Guyon's canal",
    correctDiagnosis: "Ulnar nerve entrapment at wrist",
    redHerrings: ["Carpal tunnel syndrome", "Cubital tunnel syndrome", "C8 radiculopathy"]
  },
  {
    id: "wrist_007",
    timeLimit: 30,
    presentation: "28-year-old rock climber with dorsal wrist pain, positive Watson test",
    correctDiagnosis: "Scapholunate ligament injury",
    redHerrings: ["Scaphoid fracture", "Wrist arthritis", "Ganglion cyst"]
  },
  {
    id: "wrist_008",
    timeLimit: 30,
    presentation: "32-year-old with dorsal wrist swelling, transillumination positive",
    correctDiagnosis: "Ganglion cyst",
    redHerrings: ["Wrist arthritis", "Tendon sheath inflammation", "Lipoma"]
  },
  {
    id: "wrist_009",
    timeLimit: 30,
    presentation: "26-year-old violinist with wrist pain, trigger finger, tendon catching",
    correctDiagnosis: "Trigger finger",
    redHerrings: ["Tendinitis", "Dupuytren's contracture", "Arthritis"]
  },
  {
    id: "wrist_010",
    timeLimit: 30,
    presentation: "38-year-old with wrist pain after fall, dinner fork deformity",
    correctDiagnosis: "Colles' fracture",
    redHerrings: ["Scaphoid fracture", "Wrist sprain", "Smith fracture"]
  },
  {
    id: "wrist_011",
    timeLimit: 30,
    presentation: "45-year-old diabetic with hand stiffness, prayer sign positive",
    correctDiagnosis: "Diabetic cheiroarthropathy",
    redHerrings: ["Dupuytren's contracture", "Arthritis", "Carpal tunnel syndrome"]
  },
  {
    id: "wrist_012",
    timeLimit: 30,
    presentation: "29-year-old with wrist pain, positive piano key sign at DRUJ",
    correctDiagnosis: "DRUJ instability",
    redHerrings: ["TFCC tear", "Ulnar styloid fracture", "Wrist arthritis"]
  },
  {
    id: "wrist_013",
    timeLimit: 30,
    presentation: "34-year-old with thumb base pain, positive grind test, CMC joint tenderness",
    correctDiagnosis: "CMC joint arthritis",
    redHerrings: ["De Quervain's tenosynovitis", "Scaphoid fracture", "Thumb sprain"]
  },
  {
    id: "wrist_014",
    timeLimit: 30,
    presentation: "27-year-old with wrist pain, positive Tinel's sign at carpal tunnel",
    correctDiagnosis: "Carpal tunnel syndrome",
    redHerrings: ["Pronator syndrome", "Cervical radiculopathy", "Ulnar nerve entrapment"]
  },
  {
    id: "wrist_015",
    timeLimit: 30,
    presentation: "41-year-old with wrist pain, positive Phalen's test, night symptoms",
    correctDiagnosis: "Carpal tunnel syndrome",
    redHerrings: ["Flexor tendinitis", "Wrist arthritis", "Pronator syndrome"]
  },
  {
    id: "wrist_016",
    timeLimit: 30,
    presentation: "33-year-old with radial wrist pain, positive intersection syndrome test",
    correctDiagnosis: "Intersection syndrome",
    redHerrings: ["De Quervain's tenosynovitis", "Radial nerve irritation", "Tendinitis"]
  },
  {
    id: "wrist_017",
    timeLimit: 30,
    presentation: "36-year-old with wrist pain, positive wartenberg sign, weak pinch grip",
    correctDiagnosis: "Ulnar nerve palsy",
    redHerrings: ["Ulnar nerve entrapment", "C8 radiculopathy", "Intrinsic muscle weakness"]
  },
  {
    id: "wrist_018",
    timeLimit: 30,
    presentation: "31-year-old with wrist pain, positive flexor tendon test, triggering",
    correctDiagnosis: "Flexor tendinitis",
    redHerrings: ["Carpal tunnel syndrome", "Trigger finger", "Wrist arthritis"]
  },
  {
    id: "wrist_019",
    timeLimit: 30,
    presentation: "39-year-old with wrist pain, positive extensor tendon test, lateral epicondylitis",
    correctDiagnosis: "Extensor tendinitis",
    redHerrings: ["Lateral epicondylitis", "Radial nerve irritation", "Intersection syndrome"]
  },
  {
    id: "wrist_020",
    timeLimit: 30,
    presentation: "42-year-old with palmar wrist pain, positive carpal tunnel release scar",
    correctDiagnosis: "Post-surgical carpal tunnel syndrome",
    redHerrings: ["Recurrent carpal tunnel", "Scar tissue formation", "Pillar pain"]
  }
];

const generateFootQuestions = () => [
  {
    id: "foot_001",
    timeLimit: 30,
    presentation: "45-year-old runner with heel pain, worst with first steps in morning",
    correctDiagnosis: "Plantar fasciitis",
    redHerrings: ["Heel spur", "Calcaneal fracture", "Achilles tendinitis"]
  },
  {
    id: "foot_002",
    timeLimit: 30,
    presentation: "25-year-old basketball player with acute foot pain, tender 5th metatarsal base",
    correctDiagnosis: "Jones fracture",
    redHerrings: ["Avulsion fracture", "Peroneal tendinitis", "Cuboid syndrome"]
  },
  {
    id: "foot_003",
    timeLimit: 30,
    presentation: "35-year-old with forefoot pain, numbness between 3rd/4th toes, positive Mulder's click",
    correctDiagnosis: "Morton's neuroma",
    redHerrings: ["Metatarsalgia", "Stress fracture", "Plantar plate tear"]
  },
  {
    id: "foot_004",
    timeLimit: 30,
    presentation: "50-year-old diabetic with foot ulcer, red, warm, elevated WBC",
    correctDiagnosis: "Diabetic foot infection",
    redHerrings: ["Charcot arthropathy", "Gout", "Cellulitis"]
  },
  {
    id: "foot_005",
    timeLimit: 30,
    presentation: "28-year-old dancer with posterior ankle pain, tender behind lateral malleolus",
    correctDiagnosis: "Peroneal tendinitis",
    redHerrings: ["Ankle sprain", "Achilles tendinitis", "Sural nerve irritation"]
  },
  {
    id: "foot_006",
    timeLimit: 30,
    presentation: "42-year-old with big toe pain, red, swollen, warm, history of alcohol use",
    correctDiagnosis: "Gout",
    redHerrings: ["Septic arthritis", "Ingrown toenail", "Bunion"]
  },
  {
    id: "foot_007",
    timeLimit: 30,
    presentation: "30-year-old runner with medial arch pain, flat foot deformity",
    correctDiagnosis: "Posterior tibial tendon dysfunction",
    redHerrings: ["Plantar fasciitis", "Tarsal tunnel syndrome", "Stress fracture"]
  },
  {
    id: "foot_008",
    timeLimit: 30,
    presentation: "26-year-old with forefoot pain, callus under 2nd metatarsal head",
    correctDiagnosis: "Metatarsalgia",
    redHerrings: ["Morton's neuroma", "Stress fracture", "Plantar plate tear"]
  },
  {
    id: "foot_009",
    timeLimit: 30,
    presentation: "38-year-old with medial ankle pain, numbness in plantar foot, positive Tinel's",
    correctDiagnosis: "Tarsal tunnel syndrome",
    redHerrings: ["Plantar fasciitis", "Morton's neuroma", "Posterior tibial tendinitis"]
  },
  {
    id: "foot_010",
    timeLimit: 30,
    presentation: "22-year-old runner with dorsal foot pain, tender over navicular",
    correctDiagnosis: "Navicular stress fracture",
    redHerrings: ["Midfoot sprain", "Posterior tibial tendinitis", "Accessory navicular"]
  },
  {
    id: "foot_011",
    timeLimit: 30,
    presentation: "34-year-old with lateral foot pain, tender over 5th metatarsal shaft",
    correctDiagnosis: "5th metatarsal stress fracture",
    redHerrings: ["Jones fracture", "Peroneal tendinitis", "Cuboid syndrome"]
  },
  {
    id: "foot_012",
    timeLimit: 30,
    presentation: "29-year-old with big toe deformity, bunion, hallux valgus",
    correctDiagnosis: "Hallux valgus",
    redHerrings: ["Gout", "Hallux rigidus", "Sesamoiditis"]
  },
  {
    id: "foot_013",
    timeLimit: 30,
    presentation: "41-year-old with big toe stiffness, limited dorsiflexion, degenerative changes",
    correctDiagnosis: "Hallux rigidus",
    redHerrings: ["Gout", "Hallux valgus", "Sesamoiditis"]
  },
  {
    id: "foot_014",
    timeLimit: 30,
    presentation: "27-year-old dancer with plantar big toe pain, tender sesamoid bones",
    correctDiagnosis: "Sesamoiditis",
    redHerrings: ["Hallux rigidus", "Gout", "Plantar plate tear"]
  },
  {
    id: "foot_015",
    timeLimit: 30,
    presentation: "33-year-old with lateral foot pain, tender over cuboid, midfoot mobility",
    correctDiagnosis: "Cuboid syndrome",
    redHerrings: ["Peroneal tendinitis", "5th metatarsal fracture", "Lateral ankle sprain"]
  },
  {
    id: "foot_016",
    timeLimit: 30,
    presentation: "36-year-old with Achilles pain, thickened tendon, morning stiffness",
    correctDiagnosis: "Achilles tendinopathy",
    redHerrings: ["Achilles rupture", "Retrocalcaneal bursitis", "Heel spur"]
  },
  {
    id: "foot_017",
    timeLimit: 30,
    presentation: "24-year-old with claw toes, high arch, cavus foot deformity",
    correctDiagnosis: "Pes cavus",
    redHerrings: ["Hammer toes", "Neurological disorder", "Plantar fasciitis"]
  },
  {
    id: "foot_018",
    timeLimit: 30,
    presentation: "31-year-old with flat feet, medial arch collapse, valgus heel",
    correctDiagnosis: "Pes planus",
    redHerrings: ["Posterior tibial dysfunction", "Tarsal coalition", "Arthritis"]
  },
  {
    id: "foot_019",
    timeLimit: 30,
    presentation: "39-year-old with toe deformity, PIP joint flexion, callus formation",
    correctDiagnosis: "Hammer toe",
    redHerrings: ["Claw toe", "Mallet toe", "Arthritis"]
  },
  {
    id: "foot_020",
    timeLimit: 30,
    presentation: "43-year-old with foot pain, rigid midfoot, tarsal coalition on imaging",
    correctDiagnosis: "Tarsal coalition",
    redHerrings: ["Arthritis", "Pes planus", "Posterior tibial dysfunction"]
  }
];

const generateElbowQuestions = () => [
  {
    id: "elbow_001",
    timeLimit: 30,
    presentation: "35-year-old tennis player with lateral elbow pain, tender lateral epicondyle",
    correctDiagnosis: "Lateral epicondylitis (tennis elbow)",
    redHerrings: ["Radial tunnel syndrome", "Posterior interosseous nerve syndrome", "Elbow arthritis"]
  },
  {
    id: "elbow_002",
    timeLimit: 30,
    presentation: "28-year-old golfer with medial elbow pain, tender medial epicondyle",
    correctDiagnosis: "Medial epicondylitis (golfer's elbow)",
    redHerrings: ["Ulnar nerve entrapment", "MCL injury", "Flexor tendon strain"]
  },
  {
    id: "elbow_003",
    timeLimit: 30,
    presentation: "42-year-old with elbow numbness in pinky finger, positive Tinel's at cubital tunnel",
    correctDiagnosis: "Cubital tunnel syndrome",
    redHerrings: ["Ulnar nerve entrapment at wrist", "C8 radiculopathy", "Medial epicondylitis"]
  },
  {
    id: "elbow_004",
    timeLimit: 30,
    presentation: "25-year-old weightlifter with posterior elbow pain, locking, loose body on X-ray",
    correctDiagnosis: "Elbow loose body",
    redHerrings: ["Triceps tendinitis", "Olecranon bursitis", "Posterior impingement"]
  },
  {
    id: "elbow_005",
    timeLimit: 30,
    presentation: "30-year-old pitcher with medial elbow pain, positive valgus stress test",
    correctDiagnosis: "UCL injury",
    redHerrings: ["Medial epicondylitis", "Ulnar nerve entrapment", "Flexor tendon injury"]
  },
  {
    id: "elbow_006",
    timeLimit: 30,
    presentation: "45-year-old with swollen elbow, fluctuant olecranon mass, repetitive leaning history",
    correctDiagnosis: "Olecranon bursitis",
    redHerrings: ["Septic arthritis", "Triceps tendinitis", "Elbow arthritis"]
  },
  {
    id: "elbow_007",
    timeLimit: 30,
    presentation: "32-year-old with elbow pain, weakness in wrist extension, positive Cozen's test",
    correctDiagnosis: "Lateral epicondylitis",
    redHerrings: ["Radial tunnel syndrome", "Posterior interosseous nerve palsy", "Extensor tendon rupture"]
  },
  {
    id: "elbow_008",
    timeLimit: 30,
    presentation: "38-year-old with elbow pain, weakness in grip strength, positive Mill's test",
    correctDiagnosis: "Lateral epicondylitis",
    redHerrings: ["Radial tunnel syndrome", "Carpal tunnel syndrome", "Cervical radiculopathy"]
  },
  {
    id: "elbow_009",
    timeLimit: 30,
    presentation: "26-year-old climber with elbow pain, positive elbow flexion test",
    correctDiagnosis: "Cubital tunnel syndrome",
    redHerrings: ["Medial epicondylitis", "UCL injury", "Ulnar nerve subluxation"]
  },
  {
    id: "elbow_010",
    timeLimit: 30,
    presentation: "41-year-old with elbow stiffness, loss of extension, joint space narrowing",
    correctDiagnosis: "Elbow osteoarthritis",
    redHerrings: ["Lateral epicondylitis", "Loose body", "Triceps contracture"]
  },
  {
    id: "elbow_011",
    timeLimit: 30,
    presentation: "29-year-old with radial sided elbow pain, positive Tinel's over radial tunnel",
    correctDiagnosis: "Radial tunnel syndrome",
    redHerrings: ["Lateral epicondylitis", "Posterior interosseous nerve syndrome", "Supinator syndrome"]
  },
  {
    id: "elbow_012",
    timeLimit: 30,
    presentation: "34-year-old with weakness in finger extension, no pain, positive PIN test",
    correctDiagnosis: "Posterior interosseous nerve syndrome",
    redHerrings: ["Radial tunnel syndrome", "Lateral epicondylitis", "Extensor tendon rupture"]
  },
  {
    id: "elbow_013",
    timeLimit: 30,
    presentation: "23-year-old pitcher with lateral elbow pain, osteochondritis dissecans",
    correctDiagnosis: "Osteochondritis dissecans of elbow",
    redHerrings: ["Lateral epicondylitis", "Radial head fracture", "Loose body"]
  },
  {
    id: "elbow_014",
    timeLimit: 30,
    presentation: "36-year-old with elbow pain, positive valgus extension overload test",
    correctDiagnosis: "Valgus extension overload",
    redHerrings: ["UCL injury", "Medial epicondylitis", "Olecranon impingement"]
  },
  {
    id: "elbow_015",
    timeLimit: 30,
    presentation: "31-year-old with elbow pain, positive moving valgus stress test",
    correctDiagnosis: "UCL injury",
    redHerrings: ["Medial epicondylitis", "Ulnar nerve entrapment", "Valgus extension overload"]
  },
  {
    id: "elbow_016",
    timeLimit: 30,
    presentation: "27-year-old with elbow clicking, ulnar nerve subluxation during flexion",
    correctDiagnosis: "Ulnar nerve subluxation",
    redHerrings: ["Cubital tunnel syndrome", "UCL injury", "Medial epicondylitis"]
  },
  {
    id: "elbow_017",
    timeLimit: 30,
    presentation: "39-year-old with elbow pain, positive lateral compression test",
    correctDiagnosis: "Radiocapitellar arthritis",
    redHerrings: ["Lateral epicondylitis", "Radial tunnel syndrome", "Elbow arthritis"]
  },
  {
    id: "elbow_018",
    timeLimit: 30,
    presentation: "33-year-old with elbow pain, positive posterolateral rotatory instability test",
    correctDiagnosis: "Posterolateral rotatory instability",
    redHerrings: ["Lateral epicondylitis", "Radial head subluxation", "LCL injury"]
  },
  {
    id: "elbow_019",
    timeLimit: 30,
    presentation: "37-year-old with elbow pain, positive lateral pivot shift test",
    correctDiagnosis: "Lateral collateral ligament injury",
    redHerrings: ["Lateral epicondylitis", "Posterolateral instability", "Radial head fracture"]
  },
  {
    id: "elbow_020",
    timeLimit: 30,
    presentation: "44-year-old with elbow pain, triceps weakness, positive triceps test",
    correctDiagnosis: "Triceps tendinopathy",
    redHerrings: ["Olecranon bursitis", "Posterior impingement", "Elbow arthritis"]
  }
];

const generateHandQuestions = () => [
  {
    id: "hand_001",
    timeLimit: 30,
    presentation: "35-year-old with thumb pain, positive Finkelstein's test, new mother",
    correctDiagnosis: "De Quervain's tenosynovitis",
    redHerrings: ["CMC arthritis", "Scaphoid fracture", "Radial nerve irritation"]
  },
  {
    id: "hand_002",
    timeLimit: 30,
    presentation: "26-year-old with finger catching, triggering at A1 pulley",
    correctDiagnosis: "Trigger finger",
    redHerrings: ["Flexor tendinitis", "Dupuytren's contracture", "Arthritis"]
  },
  {
    id: "hand_003",
    timeLimit: 30,
    presentation: "45-year-old with palmar nodules, finger contracture, cord formation",
    correctDiagnosis: "Dupuytren's contracture",
    redHerrings: ["Trigger finger", "Flexor tendon injury", "Palmar fibromatosis"]
  },
  {
    id: "hand_004",
    timeLimit: 30,
    presentation: "32-year-old with thumb base pain, positive grind test, CMC joint tenderness",
    correctDiagnosis: "CMC joint arthritis",
    redHerrings: ["De Quervain's tenosynovitis", "Scaphoid fracture", "Thumb sprain"]
  },
  {
    id: "hand_005",
    timeLimit: 30,
    presentation: "28-year-old with finger deformity, boutonniere appearance, PIP flexion",
    correctDiagnosis: "Boutonniere deformity",
    redHerrings: ["Swan neck deformity", "Mallet finger", "Arthritis"]
  },
  {
    id: "hand_006",
    timeLimit: 30,
    presentation: "24-year-old with finger deformity, DIP flexion, inability to extend",
    correctDiagnosis: "Mallet finger",
    redHerrings: ["Boutonniere deformity", "Flexor tendon injury", "Arthritis"]
  },
  {
    id: "hand_007",
    timeLimit: 30,
    presentation: "38-year-old with finger deformity, PIP hyperextension, DIP flexion",
    correctDiagnosis: "Swan neck deformity",
    redHerrings: ["Boutonniere deformity", "Mallet finger", "Rheumatoid arthritis"]
  },
  {
    id: "hand_008",
    timeLimit: 30,
    presentation: "41-year-old with finger swelling, sausage digits, morning stiffness",
    correctDiagnosis: "Psoriatic arthritis",
    redHerrings: ["Rheumatoid arthritis", "Osteoarthritis", "Gout"]
  },
  {
    id: "hand_009",
    timeLimit: 30,
    presentation: "29-year-old with finger pain, Heberden's nodes, DIP joint enlargement",
    correctDiagnosis: "Osteoarthritis of hands",
    redHerrings: ["Rheumatoid arthritis", "Psoriatic arthritis", "Gout"]
  },
  {
    id: "hand_010",
    timeLimit: 30,
    presentation: "34-year-old with finger pain, Bouchard's nodes, PIP joint swelling",
    correctDiagnosis: "Osteoarthritis of hands",
    redHerrings: ["Rheumatoid arthritis", "Psoriatic arthritis", "Lupus"]
  },
  {
    id: "hand_011",
    timeLimit: 30,
    presentation: "43-year-old with hand pain, ulnar deviation, MCP joint swelling",
    correctDiagnosis: "Rheumatoid arthritis",
    redHerrings: ["Osteoarthritis", "Psoriatic arthritis", "Systemic lupus"]
  },
  {
    id: "hand_012",
    timeLimit: 30,
    presentation: "31-year-old with finger laceration, inability to flex DIP joint",
    correctDiagnosis: "Flexor digitorum profundus injury",
    redHerrings: ["Flexor digitorum superficialis injury", "Tendon sheath infection", "Nerve injury"]
  },
  {
    id: "hand_013",
    timeLimit: 30,
    presentation: "27-year-old with finger laceration, inability to flex PIP joint",
    correctDiagnosis: "Flexor digitorum superficialis injury",
    redHerrings: ["Flexor digitorum profundus injury", "Central slip injury", "Nerve injury"]
  },
  {
    id: "hand_014",
    timeLimit: 30,
    presentation: "36-year-old with thumb pain, positive Froment's sign, ulnar nerve palsy",
    correctDiagnosis: "Ulnar nerve palsy",
    redHerrings: ["Median nerve palsy", "Radial nerve palsy", "Thumb arthritis"]
  },
  {
    id: "hand_015",
    timeLimit: 30,
    presentation: "39-year-old with hand weakness, thenar muscle atrophy, carpal tunnel syndrome",
    correctDiagnosis: "Median nerve palsy",
    redHerrings: ["Ulnar nerve palsy", "Radial nerve palsy", "Cervical radiculopathy"]
  },
  {
    id: "hand_016",
    timeLimit: 30,
    presentation: "33-year-old with wrist drop, inability to extend fingers at MCP",
    correctDiagnosis: "Radial nerve palsy",
    redHerrings: ["Extensor tendon rupture", "Median nerve palsy", "Ulnar nerve palsy"]
  },
  {
    id: "hand_017",
    timeLimit: 30,
    presentation: "37-year-old with finger infection, red streaking, lymphangitis",
    correctDiagnosis: "Finger infection with lymphangitis",
    redHerrings: ["Cellulitis", "Tendon sheath infection", "Abscess"]
  },
  {
    id: "hand_018",
    timeLimit: 30,
    presentation: "42-year-old with finger pain, flexor sheath infection, Kanavel's signs",
    correctDiagnosis: "Flexor tendon sheath infection",
    redHerrings: ["Cellulitis", "Arthritis", "Gout"]
  },
  {
    id: "hand_019",
    timeLimit: 30,
    presentation: "30-year-old with finger pain, felon, pulp space infection",
    correctDiagnosis: "Felon",
    redHerrings: ["Paronychia", "Cellulitis", "Herpetic whitlow"]
  },
  {
    id: "hand_020",
    timeLimit: 30,
    presentation: "25-year-old with nail bed infection, paronychia, cuticle swelling",
    correctDiagnosis: "Paronychia",
    redHerrings: ["Felon", "Herpetic whitlow", "Cellulitis"]
  }
];

async function updateCompetitionContent(competitionId: number, bodyPart: string, title: string) {
  let questions: any[] = [];
  
  switch (bodyPart) {
    case 'shoulder':
      questions = generateShoulderQuestions();
      break;
    case 'knee':
      questions = generateKneeQuestions();
      break;
    case 'back':
      questions = generateBackQuestions();
      break;
    case 'neck':
      questions = generateNeckQuestions();
      break;
    case 'hip':
      questions = generateHipQuestions();
      break;
    case 'wrist':
      questions = generateWristQuestions();
      break;
    case 'foot':
      questions = generateFootQuestions();
      break;
    case 'elbow':
      questions = generateElbowQuestions();
      break;
    case 'hand':
      questions = generateHandQuestions();
      break;
    case 'general':
      questions = generateGeneralQuestions();
      break;
    default:
      console.log(`⚠️  No specific questions for body part: ${bodyPart}, using general questions`);
      questions = generateGeneralQuestions();
  }

  const content = {
    lightning_diagnosis: {
      cases: questions
    }
  };

  try {
    // Update existing content
    const result = await db
      .update(gameContent)
      .set({ content })
      .where(eq(gameContent.competitionId, competitionId))
      .returning();

    if (result.length === 0) {
      // Create new content if none exists
      await db.insert(gameContent).values({
        competitionId,
        gameType: 'lightning_diagnosis',
        content
      });
      console.log(`✅ Created new ${bodyPart} Lightning Diagnosis content for "${title}" (ID: ${competitionId})`);
    } else {
      console.log(`✅ Updated ${bodyPart} Lightning Diagnosis content for "${title}" (ID: ${competitionId})`);
    }

    console.log(`📊 Generated ${questions.length} ${bodyPart}-specific Lightning Diagnosis questions`);
    
  } catch (error) {
    console.error(`❌ Error updating Lightning Diagnosis content for "${title}":`, error);
    throw error;
  }
}

async function generateAllLightningContent() {
  console.log('🚀 Generating comprehensive Lightning Diagnosis content for all competitions...');
  
  let successCount = 0;
  let errorCount = 0;

  for (const competition of competitions) {
    try {
      await updateCompetitionContent(competition.id, competition.bodyPart, competition.title);
      successCount++;
    } catch (error) {
      console.error(`Failed to update competition ${competition.id}: ${competition.title}`);
      errorCount++;
    }
  }

  console.log('\n🎯 Lightning Diagnosis Content Generation Summary:');
  console.log(`✅ Successfully updated: ${successCount} competitions`);
  console.log(`❌ Failed to update: ${errorCount} competitions`);
  console.log('📚 Total questions generated: ~' + (successCount * 20));
  console.log('🏆 All competitions now have body-part-specific Lightning Diagnosis content!');
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllLightningContent()
    .then(() => {
      console.log('\n🚀 All Lightning Diagnosis content generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { generateAllLightningContent };