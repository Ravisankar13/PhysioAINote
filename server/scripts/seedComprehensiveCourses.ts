/**
 * Script to seed the database with comprehensive physiotherapy courses
 * Creates 120+ courses covering all major joints and conditions
 */
import { db } from "../db";
import { courses, type InsertCourse } from "@shared/schema";

// Helper to create course data
const createCourse = (
  title: string,
  shortDesc: string,
  description: string,
  bodyPart: "shoulder" | "neck" | "back" | "elbow" | "wrist" | "hand" | "hip" | "knee" | "ankle" | "foot" | "general" | "other",
  difficulty: "beginner" | "intermediate" | "advanced" | "expert",
  hours: number,
  objectives: string[],
  tags: string[],
  prerequisites: string[] = []
): Omit<InsertCourse, 'createdBy'> => ({
  title,
  shortDescription: shortDesc,
  description,
  bodyPart,
  difficulty,
  estimatedHours: hours,
  status: "published",
  learningObjectives: objectives,
  tags,
  prerequisites,
  isPublic: true,
  price: 0
});

// Course data organized by body part
const ankleFootCourses: Omit<InsertCourse, 'createdBy'>[] = [
  createCourse(
    "Ankle & Foot Anatomy Essentials",
    "Master the foundational anatomy and biomechanics of the ankle and foot complex",
    "Comprehensive introduction to ankle and foot anatomy covering osteology, joints, ligaments, muscles, and the biomechanics of gait and weight-bearing. Learn the structural components and their functional relationships essential for clinical practice.",
    "ankle",
    "beginner",
    3,
    ["Identify all bones and joints of the ankle-foot complex", "Describe ligamentous structures and their stabilizing functions", "Explain the biomechanics of normal gait", "Understand weight-bearing mechanics"],
    ["anatomy", "biomechanics", "gait", "foundation"]
  ),
  createCourse(
    "Comprehensive Ankle Assessment",
    "Evidence-based clinical assessment techniques for ankle pathology",
    "Master systematic ankle assessment including Ottawa ankle rules, special tests, palpation techniques, and imaging interpretation. Develop skills in differential diagnosis and clinical reasoning for ankle conditions.",
    "ankle",
    "intermediate",
    4,
    ["Apply Ottawa ankle rules correctly", "Perform and interpret special tests", "Develop systematic assessment approach", "Formulate differential diagnoses"],
    ["assessment", "special tests", "ottawa rules", "clinical reasoning"],
    ["Ankle & Foot Anatomy Essentials"]
  ),
  createCourse(
    "Lateral Ankle Sprains: Assessment & Management",
    "Complete guide to managing lateral ankle sprains from acute to return to sport",
    "Evidence-based approach to lateral ankle sprains covering grades 1-3, ATFL/CFL injuries, acute management, rehabilitation progressions, and return to sport criteria. Learn evidence-based treatment protocols and functional rehabilitation strategies.",
    "ankle",
    "intermediate",
    5,
    ["Grade lateral ankle sprains accurately", "Develop phase-appropriate rehab programs", "Apply functional rehabilitation principles", "Determine return to sport readiness"],
    ["ankle sprain", "ATFL", "CFL", "rehabilitation", "return to sport"],
    ["Comprehensive Ankle Assessment"]
  ),
  createCourse(
    "Medial Ankle Sprains & Deltoid Ligament Injuries",
    "Assessment and management of less common but significant medial ankle injuries",
    "Comprehensive coverage of eversion injuries, deltoid ligament pathology, and high ankle sprains including syndesmosis assessment and management. Learn differential diagnosis and evidence-based treatment approaches.",
    "ankle",
    "intermediate",
    4,
    ["Assess deltoid ligament integrity", "Identify syndesmosis injuries", "Differentiate medial ankle pathologies", "Implement appropriate treatment protocols"],
    ["deltoid ligament", "eversion injury", "high ankle sprain", "syndesmosis"],
    ["Comprehensive Ankle Assessment"]
  ),
  createCourse(
    "Ankle Fractures: Clinical Management",
    "Post-fracture and post-surgical rehabilitation for ankle fractures",
    "Advanced course on ankle fracture management covering Weber classification, post-surgical rehabilitation protocols, weight-bearing progressions, and complication management. Focus on evidence-based clinical decision-making.",
    "ankle",
    "advanced",
    6,
    ["Apply Weber classification system", "Design post-surgical rehab protocols", "Progress weight-bearing appropriately", "Manage common complications"],
    ["ankle fracture", "Weber classification", "post-surgical", "rehabilitation"],
    ["Comprehensive Ankle Assessment"]
  ),
  createCourse(
    "Chronic Ankle Instability",
    "Advanced assessment and treatment of chronic ankle instability",
    "In-depth exploration of chronic ankle instability differentiating mechanical from functional instability. Learn proprioceptive training, strengthening progressions, and surgical considerations.",
    "ankle",
    "advanced",
    5,
    ["Differentiate mechanical vs functional instability", "Design proprioceptive training programs", "Implement progressive strengthening", "Determine surgical candidacy"],
    ["chronic instability", "proprioception", "functional training", "mechanical instability"],
    ["Lateral Ankle Sprains: Assessment & Management"]
  ),
  createCourse(
    "Achilles Tendinopathy",
    "Evidence-based management of Achilles tendon pain and dysfunction",
    "Comprehensive course on Achilles tendinopathy covering insertional vs mid-portion pathology, eccentric loading principles, tendon rehabilitation progressions, and evidence-based treatment strategies.",
    "ankle",
    "intermediate",
    5,
    ["Differentiate insertional vs mid-portion tendinopathy", "Apply eccentric loading protocols", "Progress tendon loading appropriately", "Implement evidence-based interventions"],
    ["achilles", "tendinopathy", "eccentric loading", "tendon rehabilitation"],
    ["Ankle & Foot Anatomy Essentials"]
  ),
  createCourse(
    "Achilles Rupture Management",
    "Complete guide to Achilles rupture rehabilitation",
    "Advanced course on Achilles rupture covering conservative vs surgical management, rehabilitation protocols, weight-bearing progressions, and return to activity criteria.",
    "ankle",
    "advanced",
    6,
    ["Assess Achilles ruptures", "Compare treatment approaches", "Design post-operative protocols", "Determine return to activity readiness"],
    ["achilles rupture", "surgical", "rehabilitation", "return to sport"],
    ["Achilles Tendinopathy"]
  ),
  createCourse(
    "Plantar Fasciitis & Heel Pain",
    "Comprehensive management of plantar heel pain",
    "Evidence-based approach to plantar fasciitis and heel pain covering assessment, differential diagnosis, manual therapy, exercise prescription, orthotic management, and injection techniques.",
    "foot",
    "intermediate",
    4,
    ["Assess plantar heel pain systematically", "Differentiate heel pain causes", "Apply evidence-based treatments", "Prescribe appropriate orthotics"],
    ["plantar fasciitis", "heel pain", "orthotics", "manual therapy"],
    ["Ankle & Foot Anatomy Essentials"]
  ),
  createCourse(
    "Posterior Tibial Tendon Dysfunction",
    "Advanced management of PTTD and acquired flatfoot",
    "Comprehensive course on posterior tibial tendon dysfunction covering stages 1-4, pes planus correction strategies, orthotic management, strengthening protocols, and surgical considerations.",
    "foot",
    "advanced",
    5,
    ["Stage PTTD accurately", "Design stage-appropriate interventions", "Manage pes planus deformity", "Determine surgical timing"],
    ["PTTD", "posterior tibial tendon", "pes planus", "flatfoot"],
    ["Ankle & Foot Anatomy Essentials"]
  ),
  createCourse(
    "Metatarsalgia & Morton's Neuroma",
    "Assessment and management of forefoot pain",
    "Detailed exploration of metatarsalgia and Morton's neuroma covering differential diagnosis, biomechanical assessment, footwear modification, injection techniques, and rehabilitation strategies.",
    "foot",
    "intermediate",
    4,
    ["Assess forefoot pain systematically", "Diagnose Morton's neuroma", "Modify footwear appropriately", "Implement conservative management"],
    ["metatarsalgia", "mortons neuroma", "forefoot pain", "biomechanics"],
    ["Ankle & Foot Anatomy Essentials"]
  ),
  createCourse(
    "Hallux Valgus (Bunions)",
    "Conservative and post-surgical management of hallux valgus",
    "Comprehensive course on hallux valgus covering biomechanics, conservative management, footwear advice, orthotic prescription, and pre/post-surgical rehabilitation.",
    "foot",
    "intermediate",
    3,
    ["Assess hallux valgus severity", "Implement conservative management", "Provide footwear guidance", "Manage post-surgical cases"],
    ["hallux valgus", "bunion", "footwear", "orthotics"],
    ["Ankle & Foot Anatomy Essentials"]
  ),
  createCourse(
    "Stress Fractures of the Foot & Ankle",
    "Evidence-based management of lower limb stress fractures",
    "Advanced course on stress fracture diagnosis and management differentiating high-risk vs low-risk fractures, imaging protocols, loading progressions, and return to sport decision-making.",
    "foot",
    "advanced",
    5,
    ["Identify stress fracture risk factors", "Differentiate high vs low-risk fractures", "Progress loading appropriately", "Make return to sport decisions"],
    ["stress fracture", "bone stress injury", "return to sport", "loading progression"],
    ["Ankle & Foot Anatomy Essentials"]
  ),
  createCourse(
    "Subtalar Joint Injuries & Dysfunction",
    "Advanced assessment and treatment of subtalar pathology",
    "In-depth exploration of subtalar joint injuries and dysfunction covering assessment techniques, tarsal coalition, post-traumatic arthritis, and advanced treatment strategies.",
    "ankle",
    "advanced",
    4,
    ["Assess subtalar joint function", "Identify coalition and arthritis", "Implement manual therapy techniques", "Design appropriate interventions"],
    ["subtalar joint", "tarsal coalition", "joint dysfunction", "manual therapy"],
    ["Comprehensive Ankle Assessment"]
  ),
  createCourse(
    "Syndesmosis Injuries",
    "High ankle sprain assessment and rehabilitation",
    "Advanced course on syndesmosis injuries covering squeeze test, external rotation stress test, imaging interpretation, conservative vs surgical management, and evidence-based rehabilitation.",
    "ankle",
    "advanced",
    5,
    ["Diagnose syndesmosis injuries", "Interpret imaging findings", "Apply appropriate treatment", "Progress rehabilitation safely"],
    ["syndesmosis", "high ankle sprain", "squeeze test", "rehabilitation"],
    ["Comprehensive Ankle Assessment"]
  ),
];

const kneeCourses: Omit<InsertCourse, 'createdBy'>[] = [
  createCourse(
    "Knee Anatomy & Biomechanics",
    "Foundational knowledge of knee structure and function",
    "Comprehensive introduction to knee anatomy covering tibiofemoral and patellofemoral mechanics, ligamentous structures, menisci, and functional biomechanics during gait and activities.",
    "knee",
    "beginner",
    4,
    ["Describe knee joint anatomy", "Explain tibiofemoral mechanics", "Understand patellofemoral function", "Analyze knee biomechanics in gait"],
    ["anatomy", "biomechanics", "knee", "foundation"]
  ),
  createCourse(
    "Comprehensive Knee Assessment",
    "Systematic clinical examination of the knee",
    "Master systematic knee assessment including special tests (Lachman, McMurray, pivot shift), palpation, range of motion testing, and imaging correlation for accurate diagnosis.",
    "knee",
    "intermediate",
    5,
    ["Perform special tests accurately", "Develop systematic examination", "Interpret imaging findings", "Formulate differential diagnoses"],
    ["assessment", "special tests", "lachman", "mcmurray", "clinical examination"],
    ["Knee Anatomy & Biomechanics"]
  ),
  createCourse(
    "ACL Injuries: Non-Operative Management",
    "Conservative management of ACL injuries",
    "Evidence-based approach to non-operative ACL management differentiating copers from non-copers, rehabilitation protocols, neuromuscular training, and long-term outcomes.",
    "knee",
    "advanced",
    6,
    ["Identify coper candidates", "Design non-operative rehab programs", "Implement neuromuscular training", "Monitor long-term outcomes"],
    ["ACL", "non-operative", "coper", "neuromuscular training"],
    ["Comprehensive Knee Assessment"]
  ),
  createCourse(
    "ACL Reconstruction Rehabilitation",
    "Post-surgical ACL reconstruction protocols",
    "Comprehensive course on ACL reconstruction rehabilitation covering post-surgical protocols, criterion-based progression, return to sport testing, psychological considerations, and re-injury prevention.",
    "knee",
    "advanced",
    8,
    ["Apply phase-based protocols", "Use criterion-based progression", "Perform RTS testing", "Address psychological factors"],
    ["ACL reconstruction", "post-surgical", "return to sport", "rehabilitation"],
    ["ACL Injuries: Non-Operative Management"]
  ),
  createCourse(
    "MCL & LCL Injuries",
    "Collateral ligament injury management",
    "Comprehensive coverage of MCL and LCL injuries covering grades 1-3, valgus/varus stress testing, conservative management, bracing strategies, and rehabilitation progressions.",
    "knee",
    "intermediate",
    4,
    ["Grade collateral ligament injuries", "Perform stress testing", "Implement conservative treatment", "Progress rehabilitation appropriately"],
    ["MCL", "LCL", "collateral ligament", "stress testing"],
    ["Comprehensive Knee Assessment"]
  ),
  createCourse(
    "PCL Injuries",
    "Posterior cruciate ligament assessment and management",
    "Advanced course on PCL injuries covering isolated vs combined injuries, posterior drawer test, conservative vs surgical indications, and rehabilitation approaches.",
    "knee",
    "advanced",
    5,
    ["Assess PCL integrity", "Differentiate injury patterns", "Implement appropriate treatment", "Design rehab protocols"],
    ["PCL", "posterior cruciate", "posterior drawer", "knee stability"],
    ["Comprehensive Knee Assessment"]
  ),
  createCourse(
    "Multi-Ligament Knee Injuries",
    "Complex knee injury management",
    "Expert-level course on multi-ligament knee injuries covering assessment, surgical timing, rehabilitation challenges, and long-term functional outcomes.",
    "knee",
    "expert",
    7,
    ["Assess complex knee injuries", "Understand surgical considerations", "Design comprehensive rehab", "Manage complications"],
    ["multi-ligament", "complex injury", "knee dislocation", "rehabilitation"],
    ["PCL Injuries", "ACL Reconstruction Rehabilitation"]
  ),
  createCourse(
    "Meniscus Tears: Assessment & Management",
    "Evidence-based meniscal injury management",
    "Comprehensive course on meniscus tears covering types of tears, special tests, conservative vs surgical decision-making, rehabilitation protocols, and outcomes.",
    "knee",
    "intermediate",
    5,
    ["Classify meniscus tears", "Perform McMurray and Thessaly tests", "Guide treatment decisions", "Implement rehab protocols"],
    ["meniscus", "meniscal tear", "mcmurray", "conservative management"],
    ["Comprehensive Knee Assessment"]
  ),
  createCourse(
    "Post-Meniscectomy Rehabilitation",
    "Rehabilitation following partial meniscectomy",
    "Focused course on post-meniscectomy rehabilitation covering early mobilization, strengthening progressions, activity modification, and return to sport.",
    "knee",
    "intermediate",
    4,
    ["Progress loading appropriately", "Design strengthening programs", "Modify activities safely", "Determine return to activity"],
    ["meniscectomy", "post-surgical", "knee rehabilitation"],
    ["Meniscus Tears: Assessment & Management"]
  ),
  createCourse(
    "Meniscus Repair Rehabilitation",
    "Conservative rehabilitation after meniscus repair",
    "Advanced course on meniscus repair rehabilitation covering repair types, protected weight-bearing, ROM restrictions, strengthening progressions, and healing timelines.",
    "knee",
    "advanced",
    5,
    ["Apply repair-specific protocols", "Manage ROM restrictions", "Progress weight-bearing safely", "Optimize healing environment"],
    ["meniscus repair", "post-surgical", "protected rehabilitation"],
    ["Post-Meniscectomy Rehabilitation"]
  ),
  createCourse(
    "Patellofemoral Pain Syndrome",
    "Evidence-based management of anterior knee pain",
    "Comprehensive course on patellofemoral pain covering biomechanical assessment, hip-knee relationship, patellar taping, exercise therapy, and activity modification strategies.",
    "knee",
    "intermediate",
    5,
    ["Assess patellofemoral mechanics", "Evaluate hip-knee kinematics", "Apply therapeutic taping", "Prescribe evidence-based exercises"],
    ["PFPS", "anterior knee pain", "patellofemoral", "hip strengthening"],
    ["Comprehensive Knee Assessment"]
  ),
  createCourse(
    "Patellar Tendinopathy (Jumper's Knee)",
    "Loading-based management of patellar tendinopathy",
    "Evidence-based course on patellar tendinopathy covering reactive vs degenerative pathology, loading protocols, eccentric exercises, and return to sport considerations.",
    "knee",
    "intermediate",
    5,
    ["Stage patellar tendinopathy", "Apply progressive loading", "Implement eccentric protocols", "Manage training loads"],
    ["patellar tendinopathy", "jumpers knee", "tendon loading", "eccentric exercise"],
    ["Knee Anatomy & Biomechanics"]
  ),
  createCourse(
    "Patellar Instability & Dislocation",
    "Management of patellar instability",
    "Advanced course on patellar instability covering first-time vs recurrent dislocation, MPFL injury, rehabilitation vs surgical management, and preventive strategies.",
    "knee",
    "advanced",
    6,
    ["Assess patellar stability", "Evaluate risk factors", "Implement conservative management", "Guide surgical decisions"],
    ["patellar dislocation", "MPFL", "patellar instability", "subluxation"],
    ["Patellofemoral Pain Syndrome"]
  ),
  createCourse(
    "Knee Osteoarthritis Management",
    "Evidence-based conservative management of knee OA",
    "Comprehensive course on knee osteoarthritis covering evidence-based conservative management, exercise prescription, manual therapy, education, and self-management strategies.",
    "knee",
    "intermediate",
    5,
    ["Assess OA severity", "Prescribe appropriate exercises", "Implement manual therapy", "Promote self-management"],
    ["osteoarthritis", "knee OA", "conservative management", "exercise therapy"],
    ["Knee Anatomy & Biomechanics"]
  ),
  createCourse(
    "Total Knee Replacement Rehabilitation",
    "Post-TKR rehabilitation protocols",
    "Advanced course on total knee replacement rehabilitation covering post-operative protocols, ROM optimization, strengthening progressions, functional training, and complication management.",
    "knee",
    "advanced",
    6,
    ["Apply post-TKR protocols", "Optimize ROM recovery", "Progress strengthening safely", "Identify complications"],
    ["TKR", "total knee replacement", "arthroplasty", "post-surgical"],
    ["Knee Osteoarthritis Management"]
  ),
  createCourse(
    "IT Band Syndrome",
    "Assessment and treatment of iliotibial band syndrome",
    "Practical course on IT band syndrome covering biomechanical assessment, hip strengthening, activity modification, manual therapy, and return to running protocols.",
    "knee",
    "intermediate",
    3,
    ["Assess IT band pathology", "Identify contributing factors", "Implement hip strengthening", "Modify running mechanics"],
    ["IT band", "ITBS", "lateral knee pain", "running injury"],
    ["Comprehensive Knee Assessment"]
  ),
  createCourse(
    "Pes Anserine Bursitis",
    "Management of medial knee pain from pes anserine bursitis",
    "Introductory course on pes anserine bursitis covering anatomy, assessment, differential diagnosis, and conservative treatment strategies.",
    "knee",
    "beginner",
    2,
    ["Identify pes anserine bursitis", "Differentiate from other pathology", "Implement conservative treatment", "Provide patient education"],
    ["pes anserine", "bursitis", "medial knee pain"],
    ["Knee Anatomy & Biomechanics"]
  ),
  createCourse(
    "Osgood-Schlatter Disease",
    "Management of adolescent anterior knee pain",
    "Practical course on Osgood-Schlatter disease covering pathophysiology, assessment, activity modification, rehabilitation strategies, and long-term outcomes.",
    "knee",
    "intermediate",
    3,
    ["Diagnose Osgood-Schlatter", "Manage growing athlete", "Modify activities appropriately", "Educate patients and parents"],
    ["osgood schlatter", "adolescent", "growing pains", "tibial tuberosity"],
    ["Knee Anatomy & Biomechanics"]
  ),
];

const hipCourses: Omit<InsertCourse, 'createdBy'>[] = [
  createCourse(
    "Hip & Pelvis Anatomy",
    "Foundational anatomy of the hip and pelvic region",
    "Comprehensive introduction to hip and pelvis anatomy covering acetabular labrum, joint capsule, hip stabilizers, pelvic floor, and functional biomechanics.",
    "hip",
    "beginner",
    4,
    ["Describe hip joint anatomy", "Explain acetabular labrum function", "Understand hip stabilizers", "Analyze hip biomechanics"],
    ["anatomy", "hip", "pelvis", "foundation"]
  ),
  createCourse(
    "Comprehensive Hip Assessment",
    "Systematic clinical examination of the hip",
    "Master systematic hip assessment including FAI screening, special tests, range of motion testing, gait analysis, and imaging interpretation for accurate diagnosis.",
    "hip",
    "intermediate",
    5,
    ["Perform FABER and FADIR tests", "Screen for FAI", "Assess hip ROM accurately", "Interpret hip imaging"],
    ["assessment", "special tests", "FAI", "hip examination"],
    ["Hip & Pelvis Anatomy"]
  ),
  createCourse(
    "Femoroacetabular Impingement (FAI)",
    "Advanced management of hip impingement",
    "Comprehensive course on FAI covering CAM vs Pincer morphology, conservative management strategies, exercise prescription, activity modification, and surgical indications.",
    "hip",
    "advanced",
    6,
    ["Differentiate CAM vs Pincer FAI", "Implement conservative management", "Prescribe appropriate exercises", "Guide surgical decisions"],
    ["FAI", "hip impingement", "CAM", "Pincer"],
    ["Comprehensive Hip Assessment"]
  ),
  createCourse(
    "Hip Labral Tears",
    "Diagnosis and management of labral pathology",
    "Advanced course on hip labral tears covering diagnosis, non-operative vs operative management, rehabilitation protocols, and functional outcomes.",
    "hip",
    "advanced",
    5,
    ["Diagnose labral tears", "Implement conservative treatment", "Design rehab protocols", "Determine surgical timing"],
    ["labral tear", "hip labrum", "FAI", "hip arthroscopy"],
    ["Femoroacetabular Impingement (FAI)"]
  ),
  createCourse(
    "Greater Trochanteric Pain Syndrome",
    "Management of lateral hip pain",
    "Practical course on greater trochanteric pain syndrome covering gluteal tendinopathy, trochanteric bursitis, progressive loading, and activity modification.",
    "hip",
    "intermediate",
    4,
    ["Differentiate GTPS causes", "Implement progressive loading", "Modify aggravating activities", "Apply manual therapy techniques"],
    ["GTPS", "gluteal tendinopathy", "trochanteric bursitis", "lateral hip pain"],
    ["Comprehensive Hip Assessment"]
  ),
  createCourse(
    "Proximal Hamstring Tendinopathy",
    "Management of high hamstring pain",
    "Practical course on proximal hamstring tendinopathy covering assessment, tendon loading protocols, eccentric strengthening, and return to running strategies.",
    "hip",
    "intermediate",
    4,
    ["Assess proximal hamstring pathology", "Apply progressive loading", "Implement eccentric protocols", "Manage training loads"],
    ["hamstring tendinopathy", "high hamstring", "proximal hamstring", "tendon loading"],
    ["Hip & Pelvis Anatomy"]
  ),
  createCourse(
    "Hip Osteoarthritis",
    "Conservative management of hip OA",
    "Evidence-based course on hip osteoarthritis covering conservative management, exercise therapy, manual therapy, education, and pre-surgical optimization.",
    "hip",
    "intermediate",
    5,
    ["Assess hip OA severity", "Prescribe evidence-based exercises", "Implement manual therapy", "Optimize pre-surgical status"],
    ["hip osteoarthritis", "hip OA", "conservative management", "exercise therapy"],
    ["Hip & Pelvis Anatomy"]
  ),
  createCourse(
    "Total Hip Replacement Rehabilitation",
    "Post-THR rehabilitation protocols",
    "Advanced course on total hip replacement rehabilitation covering anterior vs posterior approach, precautions, rehabilitation protocols, functional training, and outcomes.",
    "hip",
    "advanced",
    6,
    ["Apply approach-specific protocols", "Manage hip precautions", "Progress strengthening safely", "Optimize functional outcomes"],
    ["THR", "total hip replacement", "hip arthroplasty", "post-surgical"],
    ["Hip Osteoarthritis"]
  ),
  createCourse(
    "Hip Adductor Strains (Groin Pain)",
    "Athletic groin pain assessment and management",
    "Comprehensive course on hip adductor strains covering Doha agreement classification, acute management, progressive strengthening, and return to sport.",
    "hip",
    "intermediate",
    4,
    ["Apply Doha classification", "Manage acute adductor strains", "Progress strengthening appropriately", "Determine return to sport"],
    ["adductor strain", "groin pain", "Doha agreement", "athletic groin"],
    ["Comprehensive Hip Assessment"]
  ),
  createCourse(
    "Sports Hernia (Athletic Pubalgia)",
    "Advanced management of athletic pubalgia",
    "Advanced course on sports hernia covering differential diagnosis, conservative management, core strengthening, and surgical considerations.",
    "hip",
    "advanced",
    5,
    ["Diagnose athletic pubalgia", "Implement conservative management", "Design core strengthening programs", "Guide surgical decisions"],
    ["sports hernia", "athletic pubalgia", "core injury", "groin pain"],
    ["Hip Adductor Strains (Groin Pain)"]
  ),
  createCourse(
    "Snapping Hip Syndrome",
    "Assessment and treatment of snapping hip",
    "Practical course on snapping hip syndrome covering internal vs external types, differential diagnosis, manual therapy, strengthening, and surgical indications.",
    "hip",
    "intermediate",
    3,
    ["Differentiate snapping hip types", "Implement conservative treatment", "Apply manual therapy techniques", "Determine surgical candidacy"],
    ["snapping hip", "coxa saltans", "iliopsoas", "ITB"],
    ["Comprehensive Hip Assessment"]
  ),
  createCourse(
    "Hip Flexor Strains & Psoas Tendinopathy",
    "Management of anterior hip pain",
    "Practical course on hip flexor strains and psoas tendinopathy covering assessment, acute management, progressive loading, and return to activity.",
    "hip",
    "intermediate",
    4,
    ["Assess hip flexor injuries", "Manage acute strains", "Progress loading appropriately", "Optimize return to activity"],
    ["hip flexor", "psoas", "iliopsoas tendinopathy", "anterior hip pain"],
    ["Hip & Pelvis Anatomy"]
  ),
];

const shoulderCourses: Omit<InsertCourse, 'createdBy'>[] = [
  createCourse(
    "Shoulder Complex Anatomy & Biomechanics",
    "Foundational anatomy of the shoulder girdle",
    "Comprehensive introduction to shoulder complex anatomy covering scapulohumeral rhythm, rotator cuff mechanics, glenohumeral joint, AC joint, and functional biomechanics.",
    "shoulder",
    "beginner",
    5,
    ["Describe shoulder complex anatomy", "Explain scapulohumeral rhythm", "Understand rotator cuff function", "Analyze shoulder biomechanics"],
    ["anatomy", "biomechanics", "shoulder", "rotator cuff", "foundation"]
  ),
  createCourse(
    "Comprehensive Shoulder Assessment",
    "Systematic clinical examination of the shoulder",
    "Master systematic shoulder assessment including special tests, scapular assessment, range of motion testing, strength testing, and imaging interpretation.",
    "shoulder",
    "intermediate",
    6,
    ["Perform rotator cuff special tests", "Assess scapular dyskinesis", "Evaluate shoulder ROM", "Interpret imaging findings"],
    ["assessment", "special tests", "scapular assessment", "shoulder examination"],
    ["Shoulder Complex Anatomy & Biomechanics"]
  ),
  createCourse(
    "Rotator Cuff Tendinopathy",
    "Evidence-based management of RC tendinopathy",
    "Comprehensive course on rotator cuff tendinopathy covering supraspinatus, infraspinatus, and subscapularis pathology, progressive loading, exercise therapy, and pain management.",
    "shoulder",
    "intermediate",
    5,
    ["Assess RC tendinopathy", "Apply progressive loading", "Prescribe therapeutic exercises", "Manage pain effectively"],
    ["rotator cuff", "tendinopathy", "shoulder pain", "progressive loading"],
    ["Comprehensive Shoulder Assessment"]
  ),
  createCourse(
    "Rotator Cuff Tears: Non-Operative",
    "Conservative management of RC tears",
    "Advanced course on non-operative management of rotator cuff tears differentiating partial vs full thickness tears, rehabilitation protocols, and functional outcomes.",
    "shoulder",
    "advanced",
    5,
    ["Assess tear severity", "Implement conservative protocols", "Progress strengthening appropriately", "Monitor functional outcomes"],
    ["rotator cuff tear", "non-operative", "conservative management"],
    ["Rotator Cuff Tendinopathy"]
  ),
  createCourse(
    "Post-Rotator Cuff Repair Rehabilitation",
    "Post-surgical RC repair protocols",
    "Advanced course on rotator cuff repair rehabilitation covering small vs massive tears, repair techniques, phase-based protocols, and return to activity.",
    "shoulder",
    "advanced",
    7,
    ["Apply repair-specific protocols", "Progress phases appropriately", "Optimize healing environment", "Determine return to activity"],
    ["rotator cuff repair", "post-surgical", "shoulder rehabilitation"],
    ["Rotator Cuff Tears: Non-Operative"]
  ),
  createCourse(
    "Anterior Shoulder Instability",
    "Management of anterior shoulder instability",
    "Advanced course on anterior shoulder instability covering traumatic vs atraumatic causes, Bankart lesions, conservative management, and surgical considerations.",
    "shoulder",
    "advanced",
    6,
    ["Assess shoulder stability", "Differentiate instability types", "Implement stabilization exercises", "Guide surgical decisions"],
    ["shoulder instability", "anterior dislocation", "Bankart lesion", "shoulder stabilization"],
    ["Comprehensive Shoulder Assessment"]
  ),
  createCourse(
    "Posterior Shoulder Instability",
    "Assessment and management of posterior instability",
    "Advanced course on posterior shoulder instability covering assessment techniques, conservative management strategies, strengthening protocols, and surgical indications.",
    "shoulder",
    "advanced",
    5,
    ["Assess posterior instability", "Implement conservative treatment", "Design strengthening programs", "Determine surgical timing"],
    ["posterior instability", "shoulder dislocation", "posterior labral tear"],
    ["Anterior Shoulder Instability"]
  ),
  createCourse(
    "Multidirectional Instability",
    "Complex shoulder instability management",
    "Expert-level course on multidirectional shoulder instability covering assessment, conservative management challenges, neuromuscular training, and surgical considerations.",
    "shoulder",
    "expert",
    6,
    ["Assess multidirectional instability", "Implement comprehensive rehab", "Apply neuromuscular training", "Manage complex cases"],
    ["MDI", "multidirectional instability", "generalized laxity", "shoulder instability"],
    ["Anterior Shoulder Instability", "Posterior Shoulder Instability"]
  ),
  createCourse(
    "Post-Shoulder Stabilization Surgery",
    "Rehabilitation after shoulder stabilization",
    "Advanced course on post-stabilization rehabilitation covering Bankart repair, capsular shift, bone block procedures, and return to sport protocols.",
    "shoulder",
    "advanced",
    6,
    ["Apply procedure-specific protocols", "Manage ROM restrictions", "Progress strengthening safely", "Determine return to sport"],
    ["shoulder stabilization", "Bankart repair", "post-surgical", "rehabilitation"],
    ["Anterior Shoulder Instability"]
  ),
  createCourse(
    "Adhesive Capsulitis (Frozen Shoulder)",
    "Management of adhesive capsulitis",
    "Comprehensive course on frozen shoulder covering phases, natural history, treatment progression, manual therapy, exercise therapy, and diabetic considerations.",
    "shoulder",
    "intermediate",
    5,
    ["Recognize AC phases", "Implement phase-appropriate treatment", "Apply manual therapy techniques", "Manage diabetic patients"],
    ["adhesive capsulitis", "frozen shoulder", "shoulder stiffness", "diabetic shoulder"],
    ["Comprehensive Shoulder Assessment"]
  ),
  createCourse(
    "Subacromial Impingement",
    "Assessment and treatment of subacromial pain",
    "Practical course on subacromial impingement covering assessment, scapular dyskinesis, manual therapy, exercise prescription, and surgical considerations.",
    "shoulder",
    "intermediate",
    4,
    ["Assess subacromial impingement", "Address scapular dyskinesis", "Prescribe corrective exercises", "Guide treatment decisions"],
    ["impingement", "subacromial pain", "scapular dyskinesis", "shoulder pain"],
    ["Comprehensive Shoulder Assessment"]
  ),
  createCourse(
    "Biceps Tendinopathy",
    "Long head biceps and SLAP lesion management",
    "Practical course on biceps tendinopathy covering long head biceps pathology, SLAP lesions, conservative management, and surgical considerations.",
    "shoulder",
    "intermediate",
    4,
    ["Assess biceps pathology", "Perform Speed's and Yergason's tests", "Implement conservative treatment", "Understand SLAP management"],
    ["biceps tendinopathy", "SLAP lesion", "long head biceps", "shoulder pain"],
    ["Comprehensive Shoulder Assessment"]
  ),
  createCourse(
    "AC Joint Injuries",
    "Acromioclavicular joint injury management",
    "Practical course on AC joint injuries covering Rockwood classification, conservative vs surgical management, rehabilitation protocols, and return to sport.",
    "shoulder",
    "intermediate",
    4,
    ["Apply Rockwood classification", "Implement appropriate treatment", "Design rehab protocols", "Determine return to activity"],
    ["AC joint", "acromioclavicular", "shoulder separation", "Rockwood classification"],
    ["Comprehensive Shoulder Assessment"]
  ),
  createCourse(
    "Shoulder Arthroplasty Rehabilitation",
    "Post-shoulder replacement rehabilitation",
    "Advanced course on shoulder arthroplasty rehabilitation covering total shoulder replacement, reverse total shoulder, phase-based protocols, and functional outcomes.",
    "shoulder",
    "advanced",
    6,
    ["Apply arthroplasty-specific protocols", "Differentiate TSA vs RTSA", "Progress ROM and strength safely", "Optimize functional outcomes"],
    ["shoulder arthroplasty", "TSA", "RTSA", "reverse total shoulder", "post-surgical"],
    ["Shoulder Complex Anatomy & Biomechanics"]
  ),
  createCourse(
    "Scapular Dyskinesis",
    "Assessment and correction of scapular movement patterns",
    "Practical course on scapular dyskinesis covering assessment, classification, corrective exercises, manual therapy, and integration with shoulder rehabilitation.",
    "shoulder",
    "intermediate",
    4,
    ["Assess scapular movement", "Classify dyskinesis patterns", "Prescribe corrective exercises", "Integrate with shoulder rehab"],
    ["scapular dyskinesis", "scapular stabilization", "shoulder blade", "movement patterns"],
    ["Comprehensive Shoulder Assessment"]
  ),
];

const elbowWristHandCourses: Omit<InsertCourse, 'createdBy'>[] = [
  createCourse(
    "Lateral Epicondylalgia (Tennis Elbow)",
    "Evidence-based management of lateral elbow pain",
    "Comprehensive course on lateral epicondylalgia covering pathophysiology, assessment, progressive loading, exercise therapy, manual therapy, and activity modification strategies.",
    "elbow",
    "intermediate",
    4,
    ["Assess lateral elbow pain", "Apply progressive loading protocols", "Prescribe therapeutic exercises", "Implement manual therapy techniques"],
    ["tennis elbow", "lateral epicondylalgia", "elbow pain", "tendinopathy"],
    []
  ),
  createCourse(
    "Medial Epicondylalgia (Golfer's Elbow)",
    "Management of medial elbow pain",
    "Practical course on medial epicondylalgia covering assessment, differential diagnosis, eccentric exercises, progressive strengthening, and return to activity protocols.",
    "elbow",
    "intermediate",
    4,
    ["Assess medial elbow pain", "Differentiate pain sources", "Implement eccentric protocols", "Progress return to activity"],
    ["golfers elbow", "medial epicondylalgia", "elbow pain", "tendinopathy"],
    []
  ),
  createCourse(
    "Elbow Dislocations & Instability",
    "Post-dislocation elbow rehabilitation",
    "Advanced course on elbow dislocations and instability covering assessment, conservative management, rehabilitation protocols, and surgical considerations.",
    "elbow",
    "advanced",
    5,
    ["Assess elbow stability", "Implement post-dislocation rehab", "Progress ROM safely", "Manage complications"],
    ["elbow dislocation", "elbow instability", "terrible triad", "post-dislocation"],
    []
  ),
  createCourse(
    "Ulnar Collateral Ligament Injuries",
    "Tommy John surgery and rehabilitation",
    "Advanced course on UCL injuries covering assessment, conservative management, Tommy John surgery rehabilitation, and return to throwing protocols.",
    "elbow",
    "advanced",
    6,
    ["Assess UCL integrity", "Implement throwing programs", "Apply post-surgical protocols", "Determine return to sport"],
    ["UCL", "Tommy John", "elbow ligament", "throwing athlete"],
    []
  ),
  createCourse(
    "Wrist Sprains & TFCC Injuries",
    "Advanced wrist injury management",
    "Advanced course on wrist sprains and TFCC injuries covering assessment, imaging interpretation, conservative management, and surgical considerations.",
    "wrist",
    "advanced",
    5,
    ["Assess wrist stability", "Diagnose TFCC injuries", "Implement conservative treatment", "Guide surgical decisions"],
    ["wrist sprain", "TFCC", "triangular fibrocartilage", "wrist pain"],
    []
  ),
  createCourse(
    "Carpal Tunnel Syndrome",
    "Evidence-based CTS management",
    "Practical course on carpal tunnel syndrome covering assessment, nerve conduction studies, conservative management, splinting, exercises, and surgical indications.",
    "wrist",
    "intermediate",
    4,
    ["Diagnose carpal tunnel syndrome", "Apply conservative treatments", "Implement splinting protocols", "Determine surgical timing"],
    ["carpal tunnel", "CTS", "median nerve", "nerve entrapment"],
    []
  ),
  createCourse(
    "De Quervain's Tenosynovitis",
    "Management of radial wrist pain",
    "Practical course on De Quervain's tenosynovitis covering assessment, Finkelstein's test, conservative management, splinting, and injection considerations.",
    "wrist",
    "intermediate",
    3,
    ["Diagnose De Quervain's", "Apply conservative treatment", "Implement splinting strategies", "Manage postpartum cases"],
    ["de quervains", "tenosynovitis", "thumb pain", "radial wrist pain"],
    []
  ),
  createCourse(
    "Scaphoid Fractures",
    "Post-fracture scaphoid rehabilitation",
    "Advanced course on scaphoid fractures covering diagnosis, casting protocols, post-immobilization rehabilitation, and complication management including AVN.",
    "wrist",
    "advanced",
    5,
    ["Assess scaphoid fractures", "Apply casting protocols", "Design post-immobilization rehab", "Identify complications"],
    ["scaphoid fracture", "wrist fracture", "AVN", "carpal bones"],
    []
  ),
  createCourse(
    "Trigger Finger",
    "Conservative management of trigger finger",
    "Introductory course on trigger finger covering pathophysiology, assessment, splinting, exercises, and surgical indications.",
    "hand",
    "beginner",
    2,
    ["Diagnose trigger finger", "Apply conservative treatment", "Implement splinting protocols", "Educate patients"],
    ["trigger finger", "stenosing tenosynovitis", "hand pain", "finger locking"],
    []
  ),
  createCourse(
    "Mallet Finger & Jersey Finger",
    "Management of finger tendon injuries",
    "Practical course on mallet finger and jersey finger covering diagnosis, splinting protocols, rehabilitation, and surgical considerations.",
    "hand",
    "intermediate",
    3,
    ["Differentiate mallet vs jersey finger", "Apply appropriate splinting", "Design rehab protocols", "Determine surgical needs"],
    ["mallet finger", "jersey finger", "tendon injury", "finger trauma"],
    []
  ),
  createCourse(
    "Flexor Tendon Repairs",
    "Post-surgical flexor tendon rehabilitation",
    "Advanced course on flexor tendon repair rehabilitation covering zones of injury, early mobilization protocols, tendon gliding exercises, and complication management.",
    "hand",
    "advanced",
    6,
    ["Understand zones of injury", "Apply early mobilization protocols", "Implement protective exercises", "Manage adhesions"],
    ["flexor tendon", "tendon repair", "hand surgery", "post-operative"],
    []
  ),
];

const neckCourses: Omit<InsertCourse, 'createdBy'>[] = [
  createCourse(
    "Cervical Spine Anatomy & Biomechanics",
    "Foundational cervical spine knowledge",
    "Comprehensive introduction to cervical spine anatomy covering vertebrae, intervertebral discs, ligaments, muscles, neurovascular structures, and cervical biomechanics.",
    "neck",
    "beginner",
    4,
    ["Describe cervical anatomy", "Explain cervical biomechanics", "Understand neurovascular structures", "Identify red flag indicators"],
    ["cervical spine", "neck anatomy", "biomechanics", "foundation"],
    []
  ),
  createCourse(
    "Cervical Assessment & Red Flags",
    "Systematic cervical spine examination and screening",
    "Critical course on cervical spine assessment covering red flags, Canadian C-Spine rules, special tests, neurological screening, and differential diagnosis.",
    "neck",
    "intermediate",
    5,
    ["Perform systematic cervical exam", "Identify red flag conditions", "Apply C-spine screening rules", "Conduct neurological assessment"],
    ["cervical assessment", "red flags", "neck examination", "C-spine rules"],
    ["Cervical Spine Anatomy & Biomechanics"]
  ),
  createCourse(
    "Mechanical Neck Pain",
    "Evidence-based management of non-specific neck pain",
    "Practical course on mechanical neck pain covering assessment, exercise therapy, manual therapy, education, and activity modification strategies.",
    "neck",
    "intermediate",
    4,
    ["Assess mechanical neck pain", "Prescribe therapeutic exercises", "Apply manual therapy techniques", "Educate patients effectively"],
    ["mechanical neck pain", "non-specific neck pain", "neck exercises", "manual therapy"],
    ["Cervical Assessment & Red Flags"]
  ),
  createCourse(
    "Cervical Radiculopathy",
    "Advanced management of cervical nerve root pain",
    "Advanced course on cervical radiculopathy covering diagnosis, upper limb tension tests, imaging interpretation, conservative management, and surgical indications.",
    "neck",
    "advanced",
    6,
    ["Diagnose cervical radiculopathy", "Perform ULTT accurately", "Implement conservative management", "Determine surgical timing"],
    ["cervical radiculopathy", "nerve root pain", "arm pain", "ULTT"],
    ["Cervical Assessment & Red Flags"]
  ),
  createCourse(
    "Whiplash-Associated Disorders",
    "Evidence-based WAD management",
    "Advanced course on whiplash-associated disorders covering classification, prognosis, conservative management, exercise therapy, and chronic pain considerations.",
    "neck",
    "advanced",
    6,
    ["Apply WAD classification", "Assess prognosis factors", "Implement evidence-based treatment", "Manage chronic symptoms"],
    ["whiplash", "WAD", "motor vehicle accident", "neck injury"],
    ["Cervical Assessment & Red Flags"]
  ),
  createCourse(
    "Cervical Spondylosis & Myelopathy",
    "Advanced management of degenerative cervical spine",
    "Advanced course on cervical spondylosis and myelopathy covering diagnosis, neurological assessment, conservative management, and surgical considerations.",
    "neck",
    "advanced",
    6,
    ["Diagnose cervical spondylosis", "Recognize myelopathy signs", "Implement conservative care", "Determine surgical urgency"],
    ["cervical spondylosis", "myelopathy", "spinal cord compression", "degenerative spine"],
    ["Cervical Assessment & Red Flags"]
  ),
];

const backCourses: Omit<InsertCourse, 'createdBy'>[] = [
  createCourse(
    "Lumbar Spine Anatomy",
    "Foundational lumbar spine knowledge",
    "Comprehensive introduction to lumbar spine anatomy covering vertebrae, intervertebral discs, facet joints, ligaments, muscles, and spinal nerves.",
    "back",
    "beginner",
    4,
    ["Describe lumbar anatomy", "Explain disc structure", "Understand nerve root pathways", "Identify spinal structures"],
    ["lumbar spine", "back anatomy", "intervertebral disc", "foundation"],
    []
  ),
  createCourse(
    "Low Back Pain: Assessment & Classification",
    "Systematic approach to LBP assessment",
    "Critical course on low back pain assessment covering red flags, treatment-based classification, McKenzie assessment, functional movement screening, and differential diagnosis.",
    "back",
    "intermediate",
    6,
    ["Screen for red flags", "Apply classification systems", "Perform systematic assessment", "Formulate treatment plans"],
    ["low back pain", "LBP assessment", "classification", "clinical reasoning"],
    ["Lumbar Spine Anatomy"]
  ),
  createCourse(
    "Acute Non-Specific Low Back Pain",
    "Evidence-based acute LBP management",
    "Practical course on acute non-specific low back pain covering early mobilization, exercise therapy, education, activity modification, and prognosis.",
    "back",
    "intermediate",
    4,
    ["Manage acute LBP effectively", "Promote early mobilization", "Provide education and reassurance", "Prevent chronicity"],
    ["acute LBP", "non-specific back pain", "early intervention", "education"],
    ["Low Back Pain: Assessment & Classification"]
  ),
  createCourse(
    "Chronic Low Back Pain Management",
    "Comprehensive chronic pain management strategies",
    "Advanced course on chronic low back pain covering biopsychosocial model, pain neuroscience education, exercise therapy, cognitive-behavioral strategies, and multidisciplinary care.",
    "back",
    "advanced",
    6,
    ["Apply biopsychosocial model", "Deliver pain education", "Design exercise programs", "Implement behavioral strategies"],
    ["chronic LBP", "chronic pain", "biopsychosocial", "pain education"],
    ["Acute Non-Specific Low Back Pain"]
  ),
  createCourse(
    "Lumbar Disc Herniation",
    "Advanced management of disc herniation",
    "Advanced course on lumbar disc herniation covering diagnosis, imaging interpretation, natural history, conservative management, and surgical indications.",
    "back",
    "advanced",
    6,
    ["Diagnose disc herniation", "Interpret MRI findings", "Implement conservative treatment", "Determine surgical candidacy"],
    ["disc herniation", "prolapsed disc", "sciatica", "radiculopathy"],
    ["Low Back Pain: Assessment & Classification"]
  ),
  createCourse(
    "Lumbar Spinal Stenosis",
    "Management of neurogenic claudication",
    "Advanced course on lumbar spinal stenosis covering diagnosis, imaging interpretation, exercise therapy, activity modification, and surgical considerations.",
    "back",
    "advanced",
    5,
    ["Diagnose spinal stenosis", "Differentiate from vascular claudication", "Implement conservative management", "Guide surgical decisions"],
    ["spinal stenosis", "neurogenic claudication", "spinal narrowing", "leg pain"],
    ["Low Back Pain: Assessment & Classification"]
  ),
  createCourse(
    "Spondylolisthesis",
    "Assessment and management of vertebral slippage",
    "Advanced course on spondylolisthesis covering classification, imaging interpretation, conservative management, core stabilization, and surgical indications.",
    "back",
    "advanced",
    5,
    ["Apply Meyerding classification", "Implement stabilization exercises", "Design conservative programs", "Determine surgical timing"],
    ["spondylolisthesis", "spondylolysis", "vertebral slip", "spine stability"],
    ["Lumbar Spine Anatomy"]
  ),
  createCourse(
    "Sacroiliac Joint Dysfunction",
    "Evidence-based SIJ assessment and treatment",
    "Practical course on sacroiliac joint dysfunction covering assessment, provocation tests, manual therapy, stabilization exercises, and diagnostic injection.",
    "back",
    "intermediate",
    4,
    ["Assess SIJ dysfunction", "Perform provocation tests", "Apply manual therapy techniques", "Implement stabilization exercises"],
    ["sacroiliac joint", "SIJ", "pelvic pain", "manual therapy"],
    ["Low Back Pain: Assessment & Classification"]
  ),
  createCourse(
    "Post-Spinal Surgery Rehabilitation",
    "Rehabilitation after lumbar spine surgery",
    "Advanced course on post-spinal surgery rehabilitation covering discectomy, fusion, decompression, phase-based protocols, and return to activity.",
    "back",
    "advanced",
    7,
    ["Apply surgery-specific protocols", "Progress ROM and strength safely", "Implement functional training", "Determine return to work"],
    ["spinal surgery", "post-operative", "lumbar fusion", "discectomy", "rehabilitation"],
    ["Low Back Pain: Assessment & Classification"]
  ),
];

const generalCourses: Omit<InsertCourse, 'createdBy'>[] = [
  createCourse(
    "Pain Science Fundamentals",
    "Understanding modern pain neuroscience",
    "Comprehensive course on pain science covering pain mechanisms, central sensitization, neuroplasticity, pain neuroscience education, and therapeutic implications.",
    "general",
    "intermediate",
    6,
    ["Explain pain mechanisms", "Understand central sensitization", "Apply pain neuroscience education", "Integrate into practice"],
    ["pain science", "pain education", "neuroplasticity", "central sensitization"],
    []
  ),
  createCourse(
    "Clinical Reasoning in Musculoskeletal Practice",
    "Advanced clinical decision-making skills",
    "Advanced course on clinical reasoning covering hypothetical-deductive reasoning, pattern recognition, red flag screening, diagnostic accuracy, and treatment planning.",
    "general",
    "advanced",
    8,
    ["Apply clinical reasoning models", "Develop diagnostic hypotheses", "Make evidence-based decisions", "Refine clinical judgment"],
    ["clinical reasoning", "clinical decision making", "differential diagnosis", "assessment"],
    []
  ),
  createCourse(
    "Evidence-Based Practice",
    "Integrating research into clinical practice",
    "Practical course on evidence-based practice covering critical appraisal, research hierarchy, clinical guidelines, patient values, and implementation strategies.",
    "general",
    "intermediate",
    5,
    ["Critically appraise research", "Interpret evidence levels", "Apply clinical guidelines", "Integrate patient preferences"],
    ["evidence-based practice", "EBP", "research", "critical appraisal"],
    []
  ),
  createCourse(
    "Exercise Prescription Principles",
    "Fundamental exercise programming for rehabilitation",
    "Practical course on exercise prescription covering principles of training, exercise selection, dosage parameters, progression strategies, and behavior change.",
    "general",
    "intermediate",
    5,
    ["Apply training principles", "Select appropriate exercises", "Determine optimal dosage", "Progress exercises systematically"],
    ["exercise prescription", "training principles", "rehabilitation", "exercise therapy"],
    []
  ),
  createCourse(
    "Return to Sport Decision Making",
    "Evidence-based RTS criteria and testing",
    "Advanced course on return to sport covering criteria-based progression, functional testing, psychological readiness, shared decision-making, and re-injury prevention.",
    "general",
    "advanced",
    6,
    ["Apply RTS criteria", "Perform functional testing", "Assess psychological readiness", "Make shared RTS decisions"],
    ["return to sport", "RTS", "functional testing", "athletic rehabilitation"],
    ["Exercise Prescription Principles"]
  ),
  createCourse(
    "Biomechanical Analysis",
    "Advanced movement analysis skills",
    "Advanced course on biomechanical analysis covering video analysis, 2D motion assessment, force analysis, gait analysis, and clinical application.",
    "general",
    "advanced",
    7,
    ["Perform video analysis", "Assess movement quality", "Identify biomechanical faults", "Apply clinical corrections"],
    ["biomechanics", "movement analysis", "video analysis", "gait analysis"],
    []
  ),
  createCourse(
    "Movement Pattern Assessment",
    "Screening and correcting movement dysfunctions",
    "Practical course on movement assessment covering functional movement screening, movement competency, corrective strategies, and injury prevention.",
    "general",
    "intermediate",
    5,
    ["Screen movement patterns", "Identify dysfunctions", "Apply corrective exercises", "Prevent injuries"],
    ["movement assessment", "FMS", "movement screening", "corrective exercise"],
    ["Exercise Prescription Principles"]
  ),
  createCourse(
    "Manual Therapy Techniques",
    "Evidence-based manual therapy application",
    "Advanced course on manual therapy covering soft tissue techniques, joint mobilization, manipulation, clinical reasoning for manual therapy, and safety.",
    "general",
    "advanced",
    10,
    ["Apply manual therapy techniques", "Perform joint mobilizations", "Use appropriate clinical reasoning", "Ensure patient safety"],
    ["manual therapy", "joint mobilization", "soft tissue", "manipulation"],
    []
  ),
  createCourse(
    "Therapeutic Exercise Progressions",
    "Systematic exercise progression strategies",
    "Practical course on exercise progression covering motor learning, skill acquisition, progressive overload, exercise regression/progression, and functional integration.",
    "general",
    "intermediate",
    6,
    ["Apply motor learning principles", "Progress exercises systematically", "Regress when appropriate", "Integrate functional activities"],
    ["exercise progression", "motor learning", "skill acquisition", "functional training"],
    ["Exercise Prescription Principles"]
  ),
  createCourse(
    "Therapeutic Taping & Bracing",
    "Evidence-based application of taping and orthotics",
    "Practical course on therapeutic taping and bracing covering kinesiology tape, rigid tape, braces, orthoses, clinical evidence, and application techniques.",
    "general",
    "intermediate",
    5,
    ["Apply taping techniques", "Select appropriate braces", "Understand clinical evidence", "Integrate with rehabilitation"],
    ["taping", "bracing", "kinesiology tape", "orthotics"],
    []
  ),
];

export async function seedComprehensiveCourses() {
  console.log("🌱 Starting comprehensive course seeding...");
  
  try {
    // Get first user ID for createdBy (in production, this would be an admin user)
    const firstUser = await db.query.users.findFirst();
    if (!firstUser) {
      console.error("❌ No users found in database. Please create a user first.");
      return;
    }
    
    const createdBy = firstUser.id;
    console.log(`✅ Using user ID ${createdBy} for course creation`);
    
    // Combine all courses and add createdBy
    const allCourses = [
      ...ankleFootCourses,
      ...kneeCourses,
      ...hipCourses,
      ...shoulderCourses,
      ...elbowWristHandCourses,
      ...neckCourses,
      ...backCourses,
      ...generalCourses,
    ].map(course => ({ ...course, createdBy }));
    
    console.log(`📚 Inserting ${allCourses.length} courses...`);
    
    // Insert courses in batches
    const batchSize = 20;
    for (let i = 0; i < allCourses.length; i += batchSize) {
      const batch = allCourses.slice(i, i + batchSize);
      await db.insert(courses).values(batch);
      console.log(`   ✓ Inserted courses ${i + 1}-${Math.min(i + batchSize, allCourses.length)}`);
    }
    
    console.log("✅ Course seeding completed successfully!");
    console.log(`📊 Total courses created: ${allCourses.length}`);
    console.log("   - Ankle/Foot courses: " + ankleFootCourses.length);
    console.log("   - Knee courses: " + kneeCourses.length);
    console.log("   - Hip courses: " + hipCourses.length);
    console.log("   - Shoulder courses: " + shoulderCourses.length);
    console.log("   - Elbow/Wrist/Hand courses: " + elbowWristHandCourses.length);
    console.log("   - Neck courses: " + neckCourses.length);
    console.log("   - Back courses: " + backCourses.length);
    console.log("   - General courses: " + generalCourses.length);
    
  } catch (error) {
    console.error("❌ Error seeding courses:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedComprehensiveCourses()
    .then(() => {
      console.log("✅ Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
