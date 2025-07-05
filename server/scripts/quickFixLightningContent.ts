import { db } from '../db.js';
import { competitions, gameContent } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Comprehensive body-part-specific Lightning Diagnosis content (20 questions each)
const lightningContent = {
  shoulder: {
    cases: [
      {
        id: "ld_shoulder_1",
        presentation: "Tennis player, 38M, acute shoulder pain during serve, unable to lift arm overhead, positive drop arm test",
        timeLimit: 30,
        correctDiagnosis: "Rotator Cuff Tear",
        redHerrings: ["Shoulder Impingement", "Labral Tear", "Biceps Tendinitis"]
      },
      {
        id: "ld_shoulder_2", 
        presentation: "Swimmer, 24F, gradual onset shoulder pain with overhead activities, positive Hawkins test, arc of pain 80-120°",
        timeLimit: 30,
        correctDiagnosis: "Subacromial Impingement",
        redHerrings: ["Rotator Cuff Tear", "Frozen Shoulder", "AC Joint Arthritis"]
      },
      {
        id: "ld_shoulder_3",
        presentation: "Rugby player, 26M, shoulder dislocation injury, apprehension with abduction/external rotation, positive anterior apprehension test",
        timeLimit: 30,
        correctDiagnosis: "Anterior Shoulder Instability",
        redHerrings: ["Labral Tear", "Hill-Sachs Lesion", "Bankart Lesion"]
      },
      {
        id: "ld_shoulder_4",
        presentation: "Office worker, 45F, gradual onset shoulder stiffness, restricted passive range in all directions, night pain",
        timeLimit: 30,
        correctDiagnosis: "Adhesive Capsulitis (Frozen Shoulder)",
        redHerrings: ["Rotator Cuff Tendinopathy", "Arthritis", "Impingement"]
      },
      {
        id: "ld_shoulder_5",
        presentation: "Weightlifter, 32M, anterior shoulder pain, tender bicipital groove, positive Speed's test, pain with biceps contraction",
        timeLimit: 30,
        correctDiagnosis: "Biceps Tendinopathy",
        redHerrings: ["Labral Tear", "Impingement", "AC Joint Sprain"]
      },
      {
        id: "ld_shoulder_6",
        presentation: "Volleyball player, 22F, shoulder pain and clicking, positive O'Brien test, pain deep in shoulder",
        timeLimit: 30,
        correctDiagnosis: "SLAP Lesion",
        redHerrings: ["Biceps Tendinopathy", "Impingement", "AC Joint Injury"]
      },
      {
        id: "ld_shoulder_7",
        presentation: "Elderly patient, 68M, shoulder pain at AC joint, positive cross-body adduction test, joint line tenderness",
        timeLimit: 30,
        correctDiagnosis: "AC Joint Arthritis",
        redHerrings: ["Impingement", "Rotator Cuff Tear", "Frozen Shoulder"]
      },
      {
        id: "ld_shoulder_8",
        presentation: "Baseball pitcher, 19M, posterior shoulder pain, positive jerk test, pain with follow-through",
        timeLimit: 30,
        correctDiagnosis: "Posterior Shoulder Instability",
        redHerrings: ["Impingement", "Labral Tear", "Rotator Cuff Strain"]
      },
      {
        id: "ld_shoulder_9",
        presentation: "Construction worker, 42M, shoulder pain with overhead work, positive Neer test, night pain",
        timeLimit: 30,
        correctDiagnosis: "Rotator Cuff Tendinopathy",
        redHerrings: ["Impingement", "Bursitis", "Frozen Shoulder"]
      },
      {
        id: "ld_shoulder_10",
        presentation: "Swimmer, 20F, shoulder fatigue and weakness, positive empty can test, supraspinatus weakness",
        timeLimit: 30,
        correctDiagnosis: "Supraspinatus Tendinopathy",
        redHerrings: ["Impingement", "Rotator Cuff Tear", "Bursitis"]
      },
      {
        id: "ld_shoulder_11",
        presentation: "Rock climber, 28M, shoulder pain and instability, positive sulcus sign, multidirectional laxity",
        timeLimit: 30,
        correctDiagnosis: "Multidirectional Instability",
        redHerrings: ["Labral Tear", "Impingement", "Capsular Laxity"]
      },
      {
        id: "ld_shoulder_12",
        presentation: "Office worker, 35F, neck and shoulder pain, positive upper limb tension test, numbness in arm",
        timeLimit: 30,
        correctDiagnosis: "Thoracic Outlet Syndrome",
        redHerrings: ["Cervical Radiculopathy", "Shoulder Impingement", "Carpal Tunnel"]
      },
      {
        id: "ld_shoulder_13",
        presentation: "Golfer, 50M, shoulder pain with follow-through, tender posterior deltoid, pain with horizontal adduction",
        timeLimit: 30,
        correctDiagnosis: "Posterior Impingement",
        redHerrings: ["Rotator Cuff Tear", "Labral Tear", "Deltoid Strain"]
      },
      {
        id: "ld_shoulder_14",
        presentation: "Tennis player, 25F, shoulder clicking and catching, positive crank test, mechanical symptoms",
        timeLimit: 30,
        correctDiagnosis: "Labral Tear",
        redHerrings: ["SLAP Lesion", "Impingement", "Instability"]
      },
      {
        id: "ld_shoulder_15",
        presentation: "Weightlifter, 30M, anterior shoulder pain, tender AC joint, positive AC joint compression test",
        timeLimit: 30,
        correctDiagnosis: "AC Joint Sprain",
        redHerrings: ["Impingement", "Clavicle Fracture", "Deltoid Strain"]
      },
      {
        id: "ld_shoulder_16",
        presentation: "Elderly woman, 72F, shoulder weakness and pain, positive lag signs, massive rotator cuff involvement",
        timeLimit: 30,
        correctDiagnosis: "Massive Rotator Cuff Tear",
        redHerrings: ["Frozen Shoulder", "Arthritis", "Impingement"]
      },
      {
        id: "ld_shoulder_17",
        presentation: "Swimmer, 23M, shoulder pain and swelling, positive Speed's test, bicipital groove tenderness",
        timeLimit: 30,
        correctDiagnosis: "Bicipital Tendinitis",
        redHerrings: ["Labral Tear", "Impingement", "Rotator Cuff Tear"]
      },
      {
        id: "ld_shoulder_18",
        presentation: "Baseball player, 17M, shoulder pain and clicking, positive compression rotation test, overhead throwing pain",
        timeLimit: 30,
        correctDiagnosis: "Posterior Labral Tear",
        redHerrings: ["SLAP Lesion", "Impingement", "Instability"]
      },
      {
        id: "ld_shoulder_19",
        presentation: "Office worker, 40F, shoulder and arm pain, positive Adson test, symptoms with arm elevation",
        timeLimit: 30,
        correctDiagnosis: "Neurogenic Thoracic Outlet Syndrome",
        redHerrings: ["Cervical Radiculopathy", "Carpal Tunnel", "Shoulder Impingement"]
      },
      {
        id: "ld_shoulder_20",
        presentation: "Gymnast, 19F, shoulder pain with weight bearing, positive scapular dyskinesis, winging present",
        timeLimit: 30,
        correctDiagnosis: "Scapular Dyskinesis",
        redHerrings: ["Impingement", "Long Thoracic Nerve Palsy", "Rhomboid Strain"]
      }
    ]
  },

  knee: {
    cases: [
      {
        id: "ld_knee_1",
        presentation: "Soccer player, 22M, non-contact injury with pop, immediate swelling, positive Lachman test, giving way sensation",
        timeLimit: 30,
        correctDiagnosis: "ACL Rupture", 
        redHerrings: ["MCL Sprain", "Meniscal Tear", "PCL Injury"]
      },
      {
        id: "ld_knee_2",
        presentation: "Runner, 28F, gradual onset anterior knee pain, worse with stairs, positive patellar grind test, crepitus",
        timeLimit: 30,
        correctDiagnosis: "Patellofemoral Pain Syndrome",
        redHerrings: ["Patellar Tendinopathy", "ITB Syndrome", "Chondromalacia"]
      },
      {
        id: "ld_knee_3", 
        presentation: "Basketball player, 19M, medial knee pain after contact, positive valgus stress test, tender MCL",
        timeLimit: 30,
        correctDiagnosis: "MCL Sprain",
        redHerrings: ["ACL Injury", "Meniscal Tear", "Medial Plica"]
      },
      {
        id: "ld_knee_4",
        presentation: "Dancer, 25F, catching/locking sensation, positive McMurray test, joint line tenderness",
        timeLimit: 30,
        correctDiagnosis: "Meniscal Tear",
        redHerrings: ["ACL Injury", "Loose Body", "Plica Syndrome"]
      },
      {
        id: "ld_knee_5",
        presentation: "Cyclist, 35M, lateral knee pain, tender IT band, positive Ober test, pain with repetitive flexion/extension",
        timeLimit: 30,
        correctDiagnosis: "IT Band Syndrome",
        redHerrings: ["Lateral Meniscus Tear", "LCL Sprain", "Popliteus Strain"]
      },
      {
        id: "ld_knee_6",
        presentation: "Volleyball player, 20F, anterior knee pain below patella, tender patellar tendon, pain with jumping",
        timeLimit: 30,
        correctDiagnosis: "Patellar Tendinopathy",
        redHerrings: ["Patellofemoral Pain", "Osgood-Schlatter", "Quadriceps Strain"]
      },
      {
        id: "ld_knee_7",
        presentation: "Football player, 24M, posterior knee pain, positive posterior drawer test, mechanism of knee hyperextension",
        timeLimit: 30,
        correctDiagnosis: "PCL Injury",
        redHerrings: ["ACL Injury", "Hamstring Strain", "Posterior Meniscus Tear"]
      },
      {
        id: "ld_knee_8",
        presentation: "Runner, 30F, medial knee pain, positive valgus stress test, gradual onset, no swelling",
        timeLimit: 30,
        correctDiagnosis: "MCL Strain",
        redHerrings: ["Meniscal Tear", "Pes Anserine Bursitis", "Medial Plica"]
      },
      {
        id: "ld_knee_9",
        presentation: "Skier, 26M, lateral knee pain, positive varus stress test, mechanism of knee hyperextension",
        timeLimit: 30,
        correctDiagnosis: "LCL Sprain",
        redHerrings: ["Lateral Meniscus Tear", "ITB Syndrome", "Fibular Head Fracture"]
      },
      {
        id: "ld_knee_10",
        presentation: "Teenager, 15M, anterior knee pain below kneecap, tender tibial tuberosity, pain with activity",
        timeLimit: 30,
        correctDiagnosis: "Osgood-Schlatter Disease",
        redHerrings: ["Patellar Tendinopathy", "Patellofemoral Pain", "Growing Pains"]
      },
      {
        id: "ld_knee_11",
        presentation: "Gymnast, 18F, knee pain and clicking, positive patellar apprehension test, history of dislocation",
        timeLimit: 30,
        correctDiagnosis: "Patellar Instability",
        redHerrings: ["Patellofemoral Pain", "Quadriceps Weakness", "Meniscal Tear"]
      },
      {
        id: "ld_knee_12",
        presentation: "Runner, 32F, medial knee pain, tender pes anserine area, pain with stairs, local swelling",
        timeLimit: 30,
        correctDiagnosis: "Pes Anserine Bursitis",
        redHerrings: ["MCL Strain", "Meniscal Tear", "Stress Fracture"]
      },
      {
        id: "ld_knee_13",
        presentation: "Soccer player, 21M, knee giving way, positive pivot shift test, rotatory instability",
        timeLimit: 30,
        correctDiagnosis: "ACL Deficiency with Rotatory Instability",
        redHerrings: ["Meniscal Tear", "MCL Injury", "Loose Body"]
      },
      {
        id: "ld_knee_14",
        presentation: "Basketball player, 23F, posterior knee pain, tender popliteal fossa, swelling behind knee",
        timeLimit: 30,
        correctDiagnosis: "Baker's Cyst",
        redHerrings: ["Hamstring Strain", "DVT", "Popliteal Artery Entrapment"]
      },
      {
        id: "ld_knee_15",
        presentation: "Distance runner, 28F, medial knee pain, tender along joint line, catching sensation",
        timeLimit: 30,
        correctDiagnosis: "Medial Meniscus Tear",
        redHerrings: ["MCL Strain", "Pes Anserine Bursitis", "Plica Syndrome"]
      },
      {
        id: "ld_knee_16",
        presentation: "Dancer, 19F, anterior knee pain, positive plica test, snapping sensation medially",
        timeLimit: 30,
        correctDiagnosis: "Medial Plica Syndrome",
        redHerrings: ["Meniscal Tear", "Patellofemoral Pain", "MCL Strain"]
      },
      {
        id: "ld_knee_17",
        presentation: "Football player, 25M, lateral knee pain, positive Thessaly test, lateral joint line tenderness",
        timeLimit: 30,
        correctDiagnosis: "Lateral Meniscus Tear",
        redHerrings: ["LCL Sprain", "ITB Syndrome", "Lateral Collateral Ligament Strain"]
      },
      {
        id: "ld_knee_18",
        presentation: "Elderly woman, 65F, knee pain and stiffness, morning stiffness >30 minutes, crepitus",
        timeLimit: 30,
        correctDiagnosis: "Knee Osteoarthritis",
        redHerrings: ["Meniscal Tear", "Baker's Cyst", "Rheumatoid Arthritis"]
      },
      {
        id: "ld_knee_19",
        presentation: "Young athlete, 16M, lateral knee pain, tender fibular head, positive fibular head mobility test",
        timeLimit: 30,
        correctDiagnosis: "Proximal Tibiofibular Joint Dysfunction",
        redHerrings: ["LCL Sprain", "Peroneal Nerve Entrapment", "ITB Syndrome"]
      },
      {
        id: "ld_knee_20",
        presentation: "Runner, 34F, knee pain and weakness, positive quadriceps lag, difficulty with stairs",
        timeLimit: 30,
        correctDiagnosis: "Quadriceps Weakness/Atrophy",
        redHerrings: ["Patellofemoral Pain", "Femoral Nerve Palsy", "Quadriceps Strain"]
      }
    ]
  },

  ankle: {
    cases: [
      {
        id: "ld_ankle_1",
        presentation: "Soccer player, 20M, inversion injury, lateral ankle pain and swelling, positive anterior drawer test",
        timeLimit: 30,
        correctDiagnosis: "Lateral Ankle Sprain",
        redHerrings: ["Peroneal Tendon Injury", "Fibular Fracture", "Syndesmosis Sprain"]
      },
      {
        id: "ld_ankle_2",
        presentation: "Runner, 30F, gradual onset posterior ankle pain, morning stiffness, tender Achilles tendon, fusiform swelling",
        timeLimit: 30,
        correctDiagnosis: "Achilles Tendinopathy",
        redHerrings: ["Achilles Rupture", "Retrocalcaneal Bursitis", "Plantaris Rupture"]
      },
      {
        id: "ld_ankle_3",
        presentation: "Ballet dancer, 24F, medial ankle pain, tender posterior tibialis tendon, positive too-many-toes sign",
        timeLimit: 30,
        correctDiagnosis: "Posterior Tibialis Tendon Dysfunction",
        redHerrings: ["Deltoid Ligament Sprain", "Tarsal Tunnel Syndrome", "Stress Fracture"]
      },
      {
        id: "ld_ankle_4",
        presentation: "Football player, 28M, high ankle sprain mechanism, pain with external rotation, positive squeeze test",
        timeLimit: 30,
        correctDiagnosis: "Syndesmosis Sprain",
        redHerrings: ["Lateral Ankle Sprain", "Fibular Fracture", "Deltoid Sprain"]
      },
      {
        id: "ld_ankle_5",
        presentation: "Hiker, 45M, heel pain first steps in morning, tender plantar fascia, positive windlass test",
        timeLimit: 30,
        correctDiagnosis: "Plantar Fasciitis",
        redHerrings: ["Heel Spur", "Fat Pad Syndrome", "Tarsal Tunnel Syndrome"]
      },
      {
        id: "ld_ankle_6",
        presentation: "Basketball player, 22F, lateral ankle pain, peroneal tendon subluxation, positive peroneal subluxation test",
        timeLimit: 30,
        correctDiagnosis: "Peroneal Tendon Subluxation",
        redHerrings: ["Lateral Ankle Sprain", "Peroneal Tendinopathy", "Fibular Fracture"]
      },
      {
        id: "ld_ankle_7",
        presentation: "Runner, 26M, medial ankle pain and numbness, positive Tinel's sign behind medial malleolus",
        timeLimit: 30,
        correctDiagnosis: "Tarsal Tunnel Syndrome",
        redHerrings: ["Posterior Tibialis Tendinopathy", "Plantar Fasciitis", "Deltoid Sprain"]
      },
      {
        id: "ld_ankle_8",
        presentation: "Tennis player, 32F, sudden pop during push-off, unable to plantarflex, positive Thompson test",
        timeLimit: 30,
        correctDiagnosis: "Achilles Tendon Rupture",
        redHerrings: ["Achilles Tendinopathy", "Plantaris Rupture", "Gastrocnemius Strain"]
      },
      {
        id: "ld_ankle_9",
        presentation: "Soccer player, 24M, anterior ankle pain, positive anterior impingement test, pain with dorsiflexion",
        timeLimit: 30,
        correctDiagnosis: "Anterior Ankle Impingement",
        redHerrings: ["Ankle Sprain", "Osteochondral Defect", "Synovitis"]
      },
      {
        id: "ld_ankle_10",
        presentation: "Ballet dancer, 21F, posterior ankle pain, positive posterior impingement test, pain with plantarflexion",
        timeLimit: 30,
        correctDiagnosis: "Posterior Ankle Impingement",
        redHerrings: ["Achilles Tendinopathy", "FHL Tendinopathy", "Os Trigonum Syndrome"]
      },
      {
        id: "ld_ankle_11",
        presentation: "Runner, 29F, lateral foot pain, tender 5th metatarsal base, localized swelling",
        timeLimit: 30,
        correctDiagnosis: "Jones Fracture",
        redHerrings: ["Peroneal Tendon Injury", "Lateral Ankle Sprain", "Stress Fracture"]
      },
      {
        id: "ld_ankle_12",
        presentation: "Gymnast, 18F, anterior ankle pain, clicking sensation, positive anterior drawer in plantarflexion",
        timeLimit: 30,
        correctDiagnosis: "Osteochondral Defect of Talus",
        redHerrings: ["Ankle Sprain", "Anterior Impingement", "Synovitis"]
      },
      {
        id: "ld_ankle_13",
        presentation: "Football player, 25M, eversion injury, medial ankle pain, positive eversion stress test",
        timeLimit: 30,
        correctDiagnosis: "Deltoid Ligament Sprain",
        redHerrings: ["Medial Malleolus Fracture", "Posterior Tibialis Injury", "Syndesmosis Sprain"]
      },
      {
        id: "ld_ankle_14",
        presentation: "Runner, 35F, heel pain and burning, tender calcaneal fat pad, pain with heel strike",
        timeLimit: 30,
        correctDiagnosis: "Fat Pad Syndrome",
        redHerrings: ["Plantar Fasciitis", "Heel Spur", "Calcaneal Stress Fracture"]
      },
      {
        id: "ld_ankle_15",
        presentation: "Dancer, 23F, medial ankle pain, positive FHL tendon test, pain with great toe flexion",
        timeLimit: 30,
        correctDiagnosis: "FHL Tendinopathy",
        redHerrings: ["Posterior Impingement", "Tarsal Tunnel Syndrome", "Flexor Digitorum Longus Injury"]
      },
      {
        id: "ld_ankle_16",
        presentation: "Soccer player, 27M, lateral ankle instability, positive talar tilt test, chronic ankle sprains",
        timeLimit: 30,
        correctDiagnosis: "Chronic Ankle Instability",
        redHerrings: ["Peroneal Tendon Injury", "Subtalar Instability", "Lateral Ankle Sprain"]
      },
      {
        id: "ld_ankle_17",
        presentation: "Basketball player, 19M, midfoot pain, tender navicular, pain with single leg hopping",
        timeLimit: 30,
        correctDiagnosis: "Navicular Stress Fracture",
        redHerrings: ["Lisfranc Injury", "Midfoot Sprain", "Posterior Tibialis Tendinopathy"]
      },
      {
        id: "ld_ankle_18",
        presentation: "Runner, 31F, forefoot pain, tender 2nd metatarsal shaft, gradual onset with increased training",
        timeLimit: 30,
        correctDiagnosis: "Metatarsal Stress Fracture",
        redHerrings: ["Morton's Neuroma", "Metatarsalgia", "Plantar Plate Tear"]
      },
      {
        id: "ld_ankle_19",
        presentation: "Gymnast, 20F, heel pain, tender retrocalcaneal area, swelling behind heel",
        timeLimit: 30,
        correctDiagnosis: "Retrocalcaneal Bursitis",
        redHerrings: ["Achilles Tendinopathy", "Haglund's Deformity", "Insertional Achilles Tendinopathy"]
      },
      {
        id: "ld_ankle_20",
        presentation: "Soccer player, 26M, midfoot pain and instability, positive Lisfranc stress test, swelling dorsum of foot",
        timeLimit: 30,
        correctDiagnosis: "Lisfranc Injury",
        redHerrings: ["Midfoot Sprain", "Metatarsal Fracture", "Navicular Injury"]
      }
    ]
  },

  hip: {
    cases: [
      {
        id: "ld_hip_1",
        presentation: "Runner, 35F, deep groin pain, clicking sensation with hip flexion, positive FADIR test",
        timeLimit: 30,
        correctDiagnosis: "Femoroacetabular Impingement (FAI)",
        redHerrings: ["Labral Tear", "Hip Flexor Strain", "Stress Fracture"]
      },
      {
        id: "ld_hip_2",
        presentation: "Elderly woman, 75F, sudden onset hip pain after fall, unable to weight bear, shortened/externally rotated leg",
        timeLimit: 30,
        correctDiagnosis: "Hip Fracture",
        redHerrings: ["Greater Trochanter Bursitis", "Hip Arthritis", "Muscle Strain"]
      },
      {
        id: "ld_hip_3",
        presentation: "Dancer, 22F, lateral hip pain, tender greater trochanter, pain lying on side, positive Trendelenburg test",
        timeLimit: 30,
        correctDiagnosis: "Greater Trochanteric Pain Syndrome",
        redHerrings: ["IT Band Syndrome", "Hip Labral Tear", "Gluteal Tendinopathy"]
      },
      {
        id: "ld_hip_4",
        presentation: "Soccer player, 18M, anterior hip/groin pain, tender hip flexors, pain with resisted hip flexion",
        timeLimit: 30,
        correctDiagnosis: "Hip Flexor Strain",
        redHerrings: ["Sports Hernia", "FAI", "Adductor Strain"]
      },
      {
        id: "ld_hip_5",
        presentation: "Middle-aged adult, 55M, deep hip pain, morning stiffness >30 minutes, positive FABER test",
        timeLimit: 30,
        correctDiagnosis: "Hip Osteoarthritis",
        redHerrings: ["Labral Tear", "Bursitis", "Muscle Strain"]
      },
      {
        id: "ld_hip_6",
        presentation: "Hockey player, 24M, groin pain, tender adductor muscles, pain with resisted adduction",
        timeLimit: 30,
        correctDiagnosis: "Adductor Strain",
        redHerrings: ["Sports Hernia", "Hip Flexor Strain", "Osteitis Pubis"]
      },
      {
        id: "ld_hip_7",
        presentation: "Athlete, 20F, catching sensation in hip, positive McCarthy test, mechanical symptoms",
        timeLimit: 30,
        correctDiagnosis: "Hip Labral Tear",
        redHerrings: ["FAI", "Hip Flexor Strain", "Snapping Hip"]
      },
      {
        id: "ld_hip_8",
        presentation: "Runner, 28F, lateral hip snapping, positive Ober test, tight IT band",
        timeLimit: 30,
        correctDiagnosis: "External Snapping Hip Syndrome",
        redHerrings: ["Greater Trochanter Bursitis", "IT Band Syndrome", "Hip Bursitis"]
      },
      {
        id: "ld_hip_9",
        presentation: "Dancer, 19F, anterior hip snapping, positive Thomas test, tight hip flexors",
        timeLimit: 30,
        correctDiagnosis: "Internal Snapping Hip Syndrome",
        redHerrings: ["Hip Flexor Strain", "Labral Tear", "FAI"]
      },
      {
        id: "ld_hip_10",
        presentation: "Soccer player, 26M, pubic pain, tender pubic symphysis, pain with kicking",
        timeLimit: 30,
        correctDiagnosis: "Osteitis Pubis",
        redHerrings: ["Adductor Strain", "Sports Hernia", "Stress Fracture"]
      },
      {
        id: "ld_hip_11",
        presentation: "Runner, 32F, deep buttock pain, positive FABER test, sacroiliac joint tenderness",
        timeLimit: 30,
        correctDiagnosis: "Sacroiliac Joint Dysfunction",
        redHerrings: ["Piriformis Syndrome", "Lumbar Radiculopathy", "Gluteal Strain"]
      },
      {
        id: "ld_hip_12",
        presentation: "Cyclist, 29M, deep buttock pain, positive Freiberg test, pain with sitting",
        timeLimit: 30,
        correctDiagnosis: "Piriformis Syndrome",
        redHerrings: ["Sciatica", "SIJ Dysfunction", "Gluteal Strain"]
      },
      {
        id: "ld_hip_13",
        presentation: "Athlete, 21F, groin pain, positive squeeze test, pain with coughing",
        timeLimit: 30,
        correctDiagnosis: "Sports Hernia",
        redHerrings: ["Adductor Strain", "Hip Flexor Strain", "Osteitis Pubis"]
      },
      {
        id: "ld_hip_14",
        presentation: "Runner, 30F, lateral hip pain, positive single leg stance test, gluteal weakness",
        timeLimit: 30,
        correctDiagnosis: "Gluteal Tendinopathy",
        redHerrings: ["Greater Trochanter Bursitis", "IT Band Syndrome", "Hip Labral Tear"]
      },
      {
        id: "ld_hip_15",
        presentation: "Young athlete, 16M, groin pain, positive FADDIR test, activity-related pain",
        timeLimit: 30,
        correctDiagnosis: "Cam Impingement",
        redHerrings: ["Hip Flexor Strain", "Labral Tear", "Adductor Strain"]
      },
      {
        id: "ld_hip_16",
        presentation: "Female athlete, 18F, lateral hip coverage pain, positive apprehension test",
        timeLimit: 30,
        correctDiagnosis: "Hip Dysplasia",
        redHerrings: ["Labral Tear", "Greater Trochanter Bursitis", "FAI"]
      },
      {
        id: "ld_hip_17",
        presentation: "Runner, 34M, groin pain radiating to thigh, positive obturator nerve test",
        timeLimit: 30,
        correctDiagnosis: "Obturator Nerve Entrapment",
        redHerrings: ["Adductor Strain", "Sports Hernia", "Femoral Nerve Palsy"]
      },
      {
        id: "ld_hip_18",
        presentation: "Cyclist, 27F, anterior thigh numbness, positive femoral nerve stretch test",
        timeLimit: 30,
        correctDiagnosis: "Femoral Nerve Entrapment",
        redHerrings: ["Hip Flexor Strain", "Lumbar Radiculopathy", "Meralgia Paresthetica"]
      },
      {
        id: "ld_hip_19",
        presentation: "Runner, 31F, lateral thigh numbness, positive meralgia paresthetica test",
        timeLimit: 30,
        correctDiagnosis: "Meralgia Paresthetica",
        redHerrings: ["IT Band Syndrome", "Lumbar Radiculopathy", "Greater Trochanter Bursitis"]
      },
      {
        id: "ld_hip_20",
        presentation: "Elderly man, 68M, hip pain and stiffness, positive scour test, decreased range of motion",
        timeLimit: 30,
        correctDiagnosis: "Advanced Hip Osteoarthritis",
        redHerrings: ["Labral Tear", "Greater Trochanter Bursitis", "Muscle Strain"]
      }
    ]
  }
};

async function quickFixLightningContent() {
  try {
    console.log('🚀 Quick-fixing Lightning Diagnosis content with body-part-specific questions...');
    
    // Get all lightning_diagnosis competitions
    const lightningCompetitions = await db
      .select()
      .from(competitions)
      .where(eq(competitions.gameType, 'lightning_diagnosis'));

    console.log(`Found ${lightningCompetitions.length} Lightning Diagnosis competitions`);

    for (const competition of lightningCompetitions) {
      const bodyPart = competition.bodyPart as keyof typeof lightningContent;
      console.log(`📝 Fixing: ${competition.title} (${bodyPart})`);
      
      // Delete existing content
      await db
        .delete(gameContent)
        .where(eq(gameContent.competitionId, competition.id));

      // Get body-part-specific content or create basic content for missing body parts
      let content = lightningContent[bodyPart];
      
      if (!content) {
        console.log(`⚠️ No predefined content for '${bodyPart}', using fallback shoulder content`);
        content = lightningContent.shoulder;
      }

      // Insert new content
      await db.insert(gameContent).values({
        competitionId: competition.id,
        gameType: 'lightning_diagnosis',
        content: { lightningDiagnosis: content }
      });

      console.log(`✅ Fixed ${competition.title} with ${content.cases.length} ${bodyPart}-specific questions`);
    }

    console.log('🎉 All Lightning Diagnosis competitions fixed with body-part-specific content!');
    
  } catch (error) {
    console.error('❌ Error fixing Lightning Diagnosis content:', error);
    throw error;
  }
}

// Run immediately
quickFixLightningContent()
  .then(() => {
    console.log('✨ Lightning Diagnosis content fix complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to fix Lightning Diagnosis content:', error);
    process.exit(1);
  });

export { quickFixLightningContent };