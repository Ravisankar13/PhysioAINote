import { db } from '../db.ts';
import { gameContent } from '../../shared/schema.ts';
import { eq } from 'drizzle-orm';

/**
 * Generate 100 multiple choice questions for Pattern Recognition: Classic Presentations
 * Game over mechanics: User must answer consecutively correctly. Wrong answer = game over.
 * Score = number of consecutive correct answers (max 100)
 */
export async function generatePatternRecognitionContent(): Promise<void> {
  console.log('🎯 Generating 100 Pattern Recognition multiple choice questions...');

  // Create 100 multiple choice questions covering classic physiotherapy presentations
  const patternRecognitionQuestions = [
    // Questions 1-20: Basic Musculoskeletal
    {
      id: "pr_001",
      question: "22-year-old soccer player with immediate lateral ankle pain after inversion injury. Tender over ATFL, positive anterior drawer test.",
      options: ["Lateral ankle sprain", "Achilles tendinopathy", "Peroneal tendon subluxation", "Ankle fracture"],
      correctAnswer: "Lateral ankle sprain",
      explanation: "Classic ATFL injury with positive instability test in young athlete.",
      bodyPart: "ankle",
      difficulty: "easy"
    },
    {
      id: "pr_002", 
      question: "45-year-old office worker with shoulder pain during overhead activities. Painful arc 60-120°, positive Hawkins test.",
      options: ["Subacromial impingement", "Rotator cuff tear", "Frozen shoulder", "AC joint arthritis"],
      correctAnswer: "Subacromial impingement",
      explanation: "Painful arc and positive Hawkins test are classic signs of subacromial impingement.",
      bodyPart: "shoulder",
      difficulty: "easy"
    },
    {
      id: "pr_003",
      question: "35-year-old runner with morning heel pain, worse after rest. Point tenderness at medial calcaneal tuberosity.",
      options: ["Plantar fasciitis", "Achilles tendinopathy", "Calcaneal stress fracture", "Tarsal tunnel syndrome"],
      correctAnswer: "Plantar fasciitis",
      explanation: "Classic morning pain and medial heel tenderness are hallmarks of plantar fasciitis.",
      bodyPart: "foot",
      difficulty: "easy"
    },
    {
      id: "pr_004",
      question: "28-year-old tennis player with lateral elbow pain. Tenderness over lateral epicondyle, pain with resisted wrist extension.",
      options: ["Lateral epicondylitis", "Medial epicondylitis", "Radial tunnel syndrome", "Cubital tunnel syndrome"],
      correctAnswer: "Lateral epicondylitis",
      explanation: "Tennis elbow with classic presentation and positive resisted wrist extension test.",
      bodyPart: "elbow",
      difficulty: "easy"
    },
    {
      id: "pr_005",
      question: "19-year-old student with anterior knee pain worse going down stairs and after prolonged sitting. Positive J-sign.",
      options: ["Patellofemoral pain syndrome", "Patellar tendinopathy", "IT band syndrome", "Meniscus tear"],
      correctAnswer: "Patellofemoral pain syndrome",
      explanation: "Classic PFPS presentation with cinema sign and positive J-sign.",
      bodyPart: "knee",
      difficulty: "easy"
    },
    {
      id: "pr_006",
      question: "50-year-old with numbness in thumb and first two fingers, worse at night. Positive Tinel's sign at wrist.",
      options: ["Carpal tunnel syndrome", "De Quervain's tenosynovitis", "Trigger finger", "Cubital tunnel syndrome"],
      correctAnswer: "Carpal tunnel syndrome",
      explanation: "Classic CTS with nocturnal symptoms and median nerve distribution.",
      bodyPart: "wrist",
      difficulty: "easy"
    },
    {
      id: "pr_007",
      question: "25-year-old weightlifter with acute lower back pain after deadlifting. Pain with forward flexion, no neurological signs.",
      options: ["Mechanical low back pain", "Disc herniation", "Spinal stenosis", "Spondylolisthesis"],
      correctAnswer: "Mechanical low back pain",
      explanation: "Acute mechanical pain without neurological involvement in young athlete.",
      bodyPart: "back",
      difficulty: "easy"
    },
    {
      id: "pr_008",
      question: "65-year-old with gradual hip pain and morning stiffness <30 minutes. Reduced internal rotation, crepitus.",
      options: ["Hip osteoarthritis", "Hip flexor strain", "Labral tear", "Trochanteric bursitis"],
      correctAnswer: "Hip osteoarthritis",
      explanation: "Classic OA presentation with morning stiffness and reduced internal rotation.",
      bodyPart: "hip",
      difficulty: "easy"
    },
    {
      id: "pr_009",
      question: "42-year-old after MVA with neck pain and headaches. Reduced cervical ROM, upper trap spasm.",
      options: ["Whiplash-associated disorder", "Cervical radiculopathy", "Cervical myelopathy", "Torticollis"],
      correctAnswer: "Whiplash-associated disorder",
      explanation: "Recent MVA with typical WAD presentation including headaches.",
      bodyPart: "neck",
      difficulty: "easy"
    },
    {
      id: "pr_010",
      question: "40-year-old runner with sudden calf pain during sprint. Palpable defect in medial gastrocnemius.",
      options: ["Calf muscle strain", "Achilles tendinopathy", "DVT", "Compartment syndrome"],
      correctAnswer: "Calf muscle strain",
      explanation: "Acute onset with palpable defect indicates muscle strain.",
      bodyPart: "calf",
      difficulty: "easy"
    },

    // Questions 11-30: Intermediate presentations
    {
      id: "pr_011",
      question: "55-year-old with knee pain and catching sensation. Joint line tenderness, positive McMurray test, mild effusion.",
      options: ["Meniscal tear", "Patellofemoral pain", "Patellar tendinopathy", "IT band syndrome"],
      correctAnswer: "Meniscal tear", 
      explanation: "Mechanical symptoms with positive McMurray test indicate meniscal pathology.",
      bodyPart: "knee",
      difficulty: "medium"
    },
    {
      id: "pr_012",
      question: "38-year-old with lower back pain radiating to leg. Positive SLR at 45°, weakness in big toe extension.",
      options: ["L5 radiculopathy", "L4 radiculopathy", "S1 radiculopathy", "Piriformis syndrome"],
      correctAnswer: "L5 radiculopathy",
      explanation: "L5 nerve root compression with characteristic weakness pattern.",
      bodyPart: "back",
      difficulty: "medium"
    },
    {
      id: "pr_013",
      question: "29-year-old basketball player with groin pain. Pain with resisted hip adduction, positive squeeze test.",
      options: ["Adductor strain", "Hip flexor strain", "Athletic pubalgia", "Hip impingement"],
      correctAnswer: "Adductor strain",
      explanation: "Specific adductor testing confirms adductor muscle involvement.",
      bodyPart: "hip",
      difficulty: "medium"
    },
    {
      id: "pr_014",
      question: "52-year-old with symmetrical hand joint swelling in MCPs and PIPs. Morning stiffness >1 hour.",
      options: ["Rheumatoid arthritis", "Osteoarthritis", "Carpal tunnel syndrome", "De Quervain's tenosynovitis"],
      correctAnswer: "Rheumatoid arthritis",
      explanation: "Symmetrical inflammatory pattern with prolonged morning stiffness.",
      bodyPart: "hand",
      difficulty: "medium"
    },
    {
      id: "pr_015",
      question: "44-year-old runner with lateral hip pain when lying on side. Positive Trendelenburg test.",
      options: ["Greater trochanteric pain syndrome", "IT band syndrome", "Hip labral tear", "Piriformis syndrome"],
      correctAnswer: "Greater trochanteric pain syndrome",
      explanation: "Lateral hip pain with positive Trendelenburg indicates GTPS.",
      bodyPart: "hip",
      difficulty: "medium"
    },
    {
      id: "pr_016",
      question: "35-year-old swimmer with anterior shoulder pain. Positive Speed's test, pain with resisted shoulder flexion.",
      options: ["Biceps tendinopathy", "Rotator cuff tendinopathy", "AC joint injury", "Glenohumeral instability"],
      correctAnswer: "Biceps tendinopathy",
      explanation: "Anterior pain with positive Speed's test indicates biceps involvement.",
      bodyPart: "shoulder",
      difficulty: "medium"
    },
    {
      id: "pr_017",
      question: "22-year-old runner with medial shin pain during activity. Diffuse tenderness along medial tibial border.",
      options: ["Medial tibial stress syndrome", "Stress fracture", "Compartment syndrome", "Muscle strain"],
      correctAnswer: "Medial tibial stress syndrome",
      explanation: "Classic shin splints with diffuse medial tibial tenderness.",
      bodyPart: "shin",
      difficulty: "medium"
    },
    {
      id: "pr_018",
      question: "30-year-old with unilateral headaches and neck stiffness. Pain originates from occiput.",
      options: ["Cervicogenic headache", "Tension headache", "Migraine", "Cluster headache"],
      correctAnswer: "Cervicogenic headache",
      explanation: "Occipital origin with neck involvement indicates cervicogenic headache.",
      bodyPart: "head",
      difficulty: "medium"
    },
    {
      id: "pr_019",
      question: "45-year-old golfer with medial elbow pain. Pain with resisted wrist flexion and pronation.",
      options: ["Medial epicondylitis", "Lateral epicondylitis", "Cubital tunnel syndrome", "Radial nerve entrapment"],
      correctAnswer: "Medial epicondylitis",
      explanation: "Golfer's elbow with characteristic pain pattern and resistance testing.",
      bodyPart: "elbow",
      difficulty: "medium"
    },
    {
      id: "pr_020",
      question: "28-year-old runner with lateral ankle pain behind malleolus. Pain with resisted eversion.",
      options: ["Peroneal tendinopathy", "Ankle sprain", "Sinus tarsi syndrome", "Ankle impingement"],
      correctAnswer: "Peroneal tendinopathy",
      explanation: "Location and resistance testing confirm peroneal tendon involvement.",
      bodyPart: "ankle",
      difficulty: "medium"
    },

    // Questions 21-40: Advanced presentations
    {
      id: "pr_021",
      question: "40-year-old with sudden neck pain after sleeping awkwardly. Unable to turn head right, restricted rotation.",
      options: ["Cervical facet joint dysfunction", "Cervical disc herniation", "Thoracic outlet syndrome", "Scalene tension"],
      correctAnswer: "Cervical facet joint dysfunction",
      explanation: "Acute onset with rotational restriction suggests facet joint involvement.",
      bodyPart: "neck",
      difficulty: "medium"
    },
    {
      id: "pr_022",
      question: "24-year-old volleyball player with posterior shoulder pain during cocking phase. Positive relocation test.",
      options: ["Posterior shoulder impingement", "Anterior instability", "Rotator cuff tear", "AC joint injury"],
      correctAnswer: "Posterior shoulder impingement",
      explanation: "Posterior pain in overhead athlete with positive relocation test.",
      bodyPart: "shoulder",
      difficulty: "hard"
    },
    {
      id: "pr_023",
      question: "60-year-old with buttock pain and leg claudication when walking. Relief when leaning forward on shopping cart.",
      options: ["Spinal stenosis", "Disc herniation", "Piriformis syndrome", "Vascular claudication"],
      correctAnswer: "Spinal stenosis",
      explanation: "Classic neurogenic claudication with forward flexion relief.",
      bodyPart: "back",
      difficulty: "hard"
    },
    {
      id: "pr_024",
      question: "16-year-old gymnast with anterior knee pain. Pain with squatting, tender tibial tuberosity.",
      options: ["Osgood-Schlatter disease", "Patellofemoral pain", "Patellar tendinopathy", "Sinding-Larsen-Johansson"],
      correctAnswer: "Osgood-Schlatter disease",
      explanation: "Adolescent with tibial tuberosity tenderness indicates Osgood-Schlatter.",
      bodyPart: "knee",
      difficulty: "medium"
    },
    {
      id: "pr_025",
      question: "32-year-old dancer with posterior ankle pain. Pain with plantarflexion, tender posterior to lateral malleolus.",
      options: ["Posterior ankle impingement", "Achilles tendinopathy", "Calcaneal bursitis", "Sural nerve entrapment"],
      correctAnswer: "Posterior ankle impingement",
      explanation: "Posterior pain with plantarflexion in dancer suggests impingement.",
      bodyPart: "ankle",
      difficulty: "hard"
    },
    {
      id: "pr_026",
      question: "26-year-old pianist with thumb-side wrist pain. Positive Finkelstein's test, pain with thumb movement.",
      options: ["De Quervain's tenosynovitis", "Scaphoid fracture", "CMC arthritis", "Intersection syndrome"],
      correctAnswer: "De Quervain's tenosynovitis",
      explanation: "Positive Finkelstein's test is pathognomonic for De Quervain's.",
      bodyPart: "wrist",
      difficulty: "medium"
    },
    {
      id: "pr_027",
      question: "58-year-old with hip pain and limping. Thomas test positive, FABER test reproduces groin pain.",
      options: ["Hip flexor tightness with FAI", "Hip osteoarthritis", "Labral tear", "Trochanteric bursitis"],
      correctAnswer: "Hip flexor tightness with FAI",
      explanation: "Positive Thomas and FABER tests suggest hip flexor and capsular involvement.",
      bodyPart: "hip",
      difficulty: "hard"
    },
    {
      id: "pr_028",
      question: "34-year-old rock climber with finger pain. Unable to fully flex finger, tender A1 pulley.",
      options: ["Trigger finger", "Flexor tendon rupture", "Dupuytren's contracture", "Swan neck deformity"],
      correctAnswer: "Trigger finger",
      explanation: "A1 pulley tenderness with catching indicates trigger finger.",
      bodyPart: "hand",
      difficulty: "medium"
    },
    {
      id: "pr_029",
      question: "27-year-old with intermittent lower back pain and morning stiffness >1 hour. Pain improves with activity.",
      options: ["Ankylosing spondylitis", "Mechanical low back pain", "Disc herniation", "Facet joint dysfunction"],
      correctAnswer: "Ankylosing spondylitis",
      explanation: "Young adult with inflammatory pattern suggests ankylosing spondylitis.",
      bodyPart: "back",
      difficulty: "hard"
    },
    {
      id: "pr_030",
      question: "23-year-old dancer with lateral foot pain. Pain with single-leg stance, tender over 5th metatarsal base.",
      options: ["Jones fracture", "Peroneal tendinopathy", "Cuboid syndrome", "Lateral ankle sprain"],
      correctAnswer: "Jones fracture",
      explanation: "5th metatarsal base tenderness in dancer suggests Jones fracture.",
      bodyPart: "foot",
      difficulty: "hard"
    },

    // Questions 31-50: Complex multi-system presentations
    {
      id: "pr_031",
      question: "45-year-old diabetic with burning foot pain at night. Stocking distribution numbness.",
      options: ["Diabetic peripheral neuropathy", "Plantar fasciitis", "Tarsal tunnel syndrome", "Morton's neuroma"],
      correctAnswer: "Diabetic peripheral neuropathy",
      explanation: "Stocking distribution burning pain in diabetic indicates neuropathy.",
      bodyPart: "foot",
      difficulty: "hard"
    },
    {
      id: "pr_032",
      question: "62-year-old with shoulder pain and hand weakness. Positive Adson's test, paresthesias in C8-T1 distribution.",
      options: ["Thoracic outlet syndrome", "Cervical radiculopathy", "Ulnar nerve entrapment", "Carpal tunnel syndrome"],
      correctAnswer: "Thoracic outlet syndrome",
      explanation: "Positive Adson's test with C8-T1 symptoms indicates TOS.",
      bodyPart: "shoulder",
      difficulty: "hard"
    },
    {
      id: "pr_033",
      question: "19-year-old female runner with hip pain and altered gait. Positive Trendelenburg, weak hip abductors.",
      options: ["Gluteus medius weakness", "Hip labral tear", "IT band syndrome", "Stress fracture"],
      correctAnswer: "Gluteus medius weakness",
      explanation: "Positive Trendelenburg with weakness indicates gluteus medius dysfunction.",
      bodyPart: "hip",
      difficulty: "medium"
    },
    {
      id: "pr_034",
      question: "38-year-old with elbow pain and hand numbness. Positive elbow flexion test, tingling in ring and little finger.",
      options: ["Cubital tunnel syndrome", "Lateral epicondylitis", "Medial epicondylitis", "Radial tunnel syndrome"],
      correctAnswer: "Cubital tunnel syndrome",
      explanation: "Ulnar nerve distribution symptoms with positive elbow flexion test.",
      bodyPart: "elbow",
      difficulty: "hard"
    },
    {
      id: "pr_035",
      question: "55-year-old with neck pain and arm weakness. Hoffman's sign positive, hyperreflexia.",
      options: ["Cervical myelopathy", "Cervical radiculopathy", "Thoracic outlet syndrome", "Peripheral neuropathy"],
      correctAnswer: "Cervical myelopathy",
      explanation: "Upper motor neuron signs indicate cervical myelopathy.",
      bodyPart: "neck",
      difficulty: "hard"
    },
    {
      id: "pr_036",
      question: "28-year-old with foot pain between 3rd and 4th toes. Positive Mulder's click, forefoot pain.",
      options: ["Morton's neuroma", "Metatarsalgia", "Stress fracture", "Plantar plate tear"],
      correctAnswer: "Morton's neuroma",
      explanation: "Interdigital pain with Mulder's click indicates Morton's neuroma.",
      bodyPart: "foot",
      difficulty: "medium"
    },
    {
      id: "pr_037",
      question: "41-year-old with calf pain and swelling after long flight. Positive Homan's sign, unilateral edema.",
      options: ["Deep vein thrombosis", "Calf muscle strain", "Compartment syndrome", "Achilles tendinopathy"],
      correctAnswer: "Deep vein thrombosis",
      explanation: "Post-flight unilateral swelling with Homan's sign suggests DVT.",
      bodyPart: "calf",
      difficulty: "hard"
    },
    {
      id: "pr_038",
      question: "17-year-old football player with back pain. Step-off palpable at L5, pain with extension.",
      options: ["Spondylolisthesis", "Disc herniation", "Muscle strain", "Facet joint dysfunction"],
      correctAnswer: "Spondylolisthesis",
      explanation: "Palpable step-off with extension pain indicates spondylolisthesis.",
      bodyPart: "back",
      difficulty: "hard"
    },
    {
      id: "pr_039",
      question: "33-year-old with thumb pain at base. Positive grind test, pain with pinch grip.",
      options: ["CMC arthritis", "De Quervain's tenosynovitis", "Scaphoid fracture", "Trigger thumb"],
      correctAnswer: "CMC arthritis",
      explanation: "Positive grind test at thumb base indicates CMC joint arthritis.",
      bodyPart: "thumb",
      difficulty: "medium"
    },
    {
      id: "pr_040",
      question: "25-year-old with knee pain and giving way. Positive pivot shift test, negative Lachman's test.",
      options: ["Posterolateral corner injury", "ACL tear", "Meniscal tear", "PCL tear"],
      correctAnswer: "Posterolateral corner injury",
      explanation: "Positive pivot shift with negative Lachman suggests PLC injury.",
      bodyPart: "knee",
      difficulty: "hard"
    },

    // Questions 41-60: Rare and complex presentations
    {
      id: "pr_041",
      question: "36-year-old with forearm pain during activity. Pain 5cm distal to lateral epicondyle, weak finger extension.",
      options: ["Posterior interosseous nerve syndrome", "Lateral epicondylitis", "Radial tunnel syndrome", "Intersection syndrome"],
      correctAnswer: "Posterior interosseous nerve syndrome",
      explanation: "Distal forearm pain with finger extension weakness indicates PIN syndrome.",
      bodyPart: "forearm",
      difficulty: "hard"
    },
    {
      id: "pr_042",
      question: "24-year-old gymnast with wrist pain on thumb side. Pain with resisted thumb extension and abduction.",
      options: ["Intersection syndrome", "De Quervain's tenosynovitis", "Scaphoid fracture", "CMC arthritis"],
      correctAnswer: "Intersection syndrome",
      explanation: "Proximal to De Quervain's with crepitus indicates intersection syndrome.",
      bodyPart: "wrist",
      difficulty: "hard"
    },
    {
      id: "pr_043",
      question: "52-year-old with heel pain medially and distally. Burning sensation, positive Tinel's sign behind medial malleolus.",
      options: ["Tarsal tunnel syndrome", "Plantar fasciitis", "Calcaneal bursitis", "Achilles tendinopathy"],
      correctAnswer: "Tarsal tunnel syndrome",
      explanation: "Posterior tibial nerve entrapment with positive Tinel's at tarsal tunnel.",
      bodyPart: "foot",
      difficulty: "hard"
    },
    {
      id: "pr_044",
      question: "29-year-old weightlifter with lateral knee pain. ITB tight, positive Ober's test, pain over lateral epicondyle.",
      options: ["IT band syndrome", "Lateral meniscus tear", "LCL sprain", "Biceps femoris strain"],
      correctAnswer: "IT band syndrome",
      explanation: "Lateral knee pain with tight ITB and positive Ober's test.",
      bodyPart: "knee",
      difficulty: "medium"
    },
    {
      id: "pr_045",
      question: "48-year-old with buttock pain and leg symptoms. Positive FAIR test, tenderness over piriformis.",
      options: ["Piriformis syndrome", "Sciatica", "SI joint dysfunction", "Hip impingement"],
      correctAnswer: "Piriformis syndrome",
      explanation: "Positive FAIR test with piriformis tenderness indicates piriformis syndrome.",
      bodyPart: "hip",
      difficulty: "hard"
    },
    {
      id: "pr_046",
      question: "21-year-old dancer with medial ankle pain. Pain with forced dorsiflexion, tender posteromedial ankle.",
      options: ["Medial ankle impingement", "Deltoid ligament sprain", "Tarsal tunnel syndrome", "Flexor tendinopathy"],
      correctAnswer: "Medial ankle impingement",
      explanation: "Posteromedial pain with dorsiflexion in dancer suggests impingement.",
      bodyPart: "ankle",
      difficulty: "hard"
    },
    {
      id: "pr_047",
      question: "37-year-old with shoulder pain and weakness. Positive belly press test, difficulty with internal rotation.",
      options: ["Subscapularis tear", "Supraspinatus tear", "Infraspinatus tear", "Anterior instability"],
      correctAnswer: "Subscapularis tear",
      explanation: "Positive belly press test indicates subscapularis muscle involvement.",
      bodyPart: "shoulder",
      difficulty: "hard"
    },
    {
      id: "pr_048",
      question: "15-year-old swimmer with shoulder pain. Positive sulcus sign, apprehension with abduction/external rotation.",
      options: ["Multidirectional instability", "Anterior instability", "Posterior instability", "Impingement syndrome"],
      correctAnswer: "Multidirectional instability",
      explanation: "Positive sulcus sign indicates inferior laxity and MDI.",
      bodyPart: "shoulder",
      difficulty: "hard"
    },
    {
      id: "pr_049",
      question: "43-year-old with hand numbness at night. Symptoms in thumb, index, and middle finger only.",
      options: ["Carpal tunnel syndrome", "Cubital tunnel syndrome", "Thoracic outlet syndrome", "Cervical radiculopathy"],
      correctAnswer: "Carpal tunnel syndrome",
      explanation: "Classic median nerve distribution indicates carpal tunnel syndrome.",
      bodyPart: "hand",
      difficulty: "medium"
    },
    {
      id: "pr_050",
      question: "31-year-old with foot pain on lateral border. Pain with inversion, tender over 5th metatarsal shaft.",
      options: ["5th metatarsal stress fracture", "Cuboid syndrome", "Peroneal tendinopathy", "Lateral ankle sprain"],
      correctAnswer: "5th metatarsal stress fracture",
      explanation: "Lateral foot pain with metatarsal shaft tenderness indicates stress fracture.",
      bodyPart: "foot",
      difficulty: "hard"
    },

    // Questions 51-70: Advanced neurological and systemic presentations
    {
      id: "pr_051",
      question: "56-year-old with burning shoulder pain at night. Weakness in shoulder abduction and external rotation.",
      options: ["Rotator cuff tear", "Frozen shoulder", "Cervical radiculopathy", "Subacromial bursitis"],
      correctAnswer: "Rotator cuff tear",
      explanation: "Night pain with weakness indicates significant rotator cuff pathology.",
      bodyPart: "shoulder",
      difficulty: "medium"
    },
    {
      id: "pr_052",
      question: "22-year-old with chronic ankle instability. Multiple previous sprains, positive anterior drawer and talar tilt.",
      options: ["Chronic ankle instability", "Peroneal tendon tear", "Subtalar instability", "Tarsal coalition"],
      correctAnswer: "Chronic ankle instability",
      explanation: "History of multiple sprains with positive instability tests indicates CAI.",
      bodyPart: "ankle",
      difficulty: "medium"
    },
    {
      id: "pr_053",
      question: "39-year-old with lateral elbow pain radiating to forearm. Pain with middle finger extension against resistance.",
      options: ["Radial tunnel syndrome", "Lateral epicondylitis", "Posterior interosseous nerve syndrome", "Intersection syndrome"],
      correctAnswer: "Radial tunnel syndrome",
      explanation: "Middle finger extension test positive indicates radial tunnel syndrome.",
      bodyPart: "elbow",
      difficulty: "hard"
    },
    {
      id: "pr_054",
      question: "18-year-old basketball player with knee pain below patella. Tender patellar tendon, pain with jumping.",
      options: ["Patellar tendinopathy", "Patellofemoral pain", "Osgood-Schlatter disease", "Sinding-Larsen-Johansson"],
      correctAnswer: "Patellar tendinopathy",
      explanation: "Patellar tendon tenderness with jumping pain indicates tendinopathy.",
      bodyPart: "knee",
      difficulty: "medium"
    },
    {
      id: "pr_055",
      question: "47-year-old with gradual onset hand stiffness. Nodular thickening of palmar fascia, finger contracture.",
      options: ["Dupuytren's contracture", "Trigger finger", "Rheumatoid arthritis", "Carpal tunnel syndrome"],
      correctAnswer: "Dupuytren's contracture",
      explanation: "Palmar fascial thickening with contracture indicates Dupuytren's disease.",
      bodyPart: "hand",
      difficulty: "medium"
    },
    {
      id: "pr_056",
      question: "26-year-old runner with medial knee pain. Pain along medial joint line, worse with valgus stress.",
      options: ["MCL sprain", "Medial meniscus tear", "Pes anserine bursitis", "Patellofemoral pain"],
      correctAnswer: "MCL sprain",
      explanation: "Medial joint line pain with valgus stress indicates MCL injury.",
      bodyPart: "knee",
      difficulty: "medium"
    },
    {
      id: "pr_057",
      question: "64-year-old with progressive back pain and leg claudication. Symptoms worse with extension, better with flexion.",
      options: ["Spinal stenosis", "Disc herniation", "Facet joint arthritis", "Spondylolisthesis"],
      correctAnswer: "Spinal stenosis",
      explanation: "Neurogenic claudication with extension intolerance indicates stenosis.",
      bodyPart: "back",
      difficulty: "hard"
    },
    {
      id: "pr_058",
      question: "32-year-old with thumb pain at CMC joint. Positive grind test, pain with key pinch.",
      options: ["CMC arthritis", "De Quervain's tenosynovitis", "Scaphoid fracture", "Trigger thumb"],
      correctAnswer: "CMC arthritis",
      explanation: "CMC joint involvement with positive grind test indicates arthritis.",
      bodyPart: "thumb",
      difficulty: "medium"
    },
    {
      id: "pr_059",
      question: "44-year-old with hip pain and clicking. Pain with hip flexion, positive FABER test.",
      options: ["Hip labral tear", "Hip impingement", "Hip osteoarthritis", "Psoas bursitis"],
      correctAnswer: "Hip labral tear",
      explanation: "Mechanical symptoms with positive FABER suggest labral pathology.",
      bodyPart: "hip",
      difficulty: "hard"
    },
    {
      id: "pr_060",
      question: "29-year-old with foot pain over 2nd metatarsal head. Pain with weight bearing, callus formation.",
      options: ["Metatarsalgia", "Morton's neuroma", "Stress fracture", "Plantar plate tear"],
      correctAnswer: "Metatarsalgia",
      explanation: "Metatarsal head pain with callus indicates metatarsalgia.",
      bodyPart: "foot",
      difficulty: "medium"
    },

    // Questions 61-80: Expert-level diagnostic challenges
    {
      id: "pr_061",
      question: "35-year-old violinist with neck pain and arm symptoms. Positive elevated arm stress test, C8-T1 distribution.",
      options: ["Thoracic outlet syndrome", "Cervical radiculopathy", "Ulnar nerve entrapment", "Carpal tunnel syndrome"],
      correctAnswer: "Thoracic outlet syndrome",
      explanation: "Elevated arm stress test positive with C8-T1 symptoms indicates TOS.",
      bodyPart: "neck",
      difficulty: "hard"
    },
    {
      id: "pr_062",
      question: "19-year-old gymnast with wrist pain during weight bearing. Pain over scaphoid, positive scaphoid shift test.",
      options: ["Scaphoid instability", "Scaphoid fracture", "TFCC tear", "Kienbock's disease"],
      correctAnswer: "Scaphoid instability",
      explanation: "Positive scaphoid shift test indicates scapholunate instability.",
      bodyPart: "wrist",
      difficulty: "hard"
    },
    {
      id: "pr_063",
      question: "42-year-old with progressive foot deformity. Pes planus, weakness in tibialis posterior, too many toes sign.",
      options: ["Posterior tibial tendon dysfunction", "Plantar fasciitis", "Tarsal tunnel syndrome", "Achilles tendinopathy"],
      correctAnswer: "Posterior tibial tendon dysfunction",
      explanation: "Progressive flatfoot with too many toes sign indicates PTTD.",
      bodyPart: "foot",
      difficulty: "hard"
    },
    {
      id: "pr_064",
      question: "16-year-old dancer with hip pain and limited internal rotation. Positive anterior impingement test.",
      options: ["Femoroacetabular impingement", "Hip labral tear", "Hip flexor strain", "Stress fracture"],
      correctAnswer: "Femoroacetabular impingement",
      explanation: "Limited internal rotation with impingement test indicates FAI.",
      bodyPart: "hip",
      difficulty: "hard"
    },
    {
      id: "pr_065",
      question: "38-year-old with elbow pain and weak grip. Positive chair test, pain with resisted supination.",
      options: ["Lateral epicondylitis", "Radial tunnel syndrome", "PIN syndrome", "Intersection syndrome"],
      correctAnswer: "Lateral epicondylitis",
      explanation: "Chair test and resisted supination pain indicate lateral epicondylitis.",
      bodyPart: "elbow",
      difficulty: "medium"
    },
    {
      id: "pr_066",
      question: "51-year-old with shoulder pain and weakness. Positive drop arm test, external rotation lag sign.",
      options: ["Rotator cuff tear", "Frozen shoulder", "Impingement syndrome", "Instability"],
      correctAnswer: "Rotator cuff tear",
      explanation: "Positive drop arm and lag signs indicate rotator cuff tear.",
      bodyPart: "shoulder",
      difficulty: "medium"
    },
    {
      id: "pr_067",
      question: "27-year-old with knee pain and instability. Positive posterior drawer, posterior sag sign.",
      options: ["PCL tear", "ACL tear", "Meniscus tear", "LCL tear"],
      correctAnswer: "PCL tear",
      explanation: "Posterior instability tests indicate PCL injury.",
      bodyPart: "knee",
      difficulty: "hard"
    },
    {
      id: "pr_068",
      question: "33-year-old with chronic back pain. Pain worse in morning, improves with activity, positive Schober's test.",
      options: ["Ankylosing spondylitis", "Disc herniation", "Mechanical back pain", "Facet joint arthritis"],
      correctAnswer: "Ankylosing spondylitis",
      explanation: "Inflammatory pattern with reduced spinal mobility indicates AS.",
      bodyPart: "back",
      difficulty: "hard"
    },
    {
      id: "pr_069",
      question: "24-year-old with heel pain and morning stiffness. Bilateral involvement, family history of autoimmune disease.",
      options: ["Seronegative spondyloarthropathy", "Plantar fasciitis", "Achilles tendinopathy", "Calcaneal bursitis"],
      correctAnswer: "Seronegative spondyloarthropathy",
      explanation: "Bilateral heel pain with family history suggests spondyloarthropathy.",
      bodyPart: "heel",
      difficulty: "hard"
    },
    {
      id: "pr_070",
      question: "45-year-old with hand numbness and weakness. Positive Froment's sign, weakness in finger abduction.",
      options: ["Ulnar nerve entrapment", "Carpal tunnel syndrome", "Thoracic outlet syndrome", "Cervical radiculopathy"],
      correctAnswer: "Ulnar nerve entrapment",
      explanation: "Froment's sign and intrinsic weakness indicate ulnar nerve compression.",
      bodyPart: "hand",
      difficulty: "hard"
    },

    // Questions 71-90: Master-level presentations
    {
      id: "pr_071",
      question: "28-year-old pitcher with shoulder pain in late cocking phase. Positive relocation test, apprehension at 90° abduction.",
      options: ["Anterior shoulder instability", "Posterior impingement", "SLAP tear", "Rotator cuff tear"],
      correctAnswer: "Anterior shoulder instability",
      explanation: "Apprehension and positive relocation test indicate anterior instability.",
      bodyPart: "shoulder",
      difficulty: "hard"
    },
    {
      id: "pr_072",
      question: "17-year-old soccer player with knee pain and swelling. Positive Lachman's test, positive pivot shift.",
      options: ["ACL tear", "PCL tear", "Meniscus tear", "MCL tear"],
      correctAnswer: "ACL tear",
      explanation: "Positive Lachman's and pivot shift indicate ACL rupture.",
      bodyPart: "knee",
      difficulty: "medium"
    },
    {
      id: "pr_073",
      question: "52-year-old with progressive hand weakness. Thenar muscle wasting, positive Phalen's test.",
      options: ["Carpal tunnel syndrome", "Ulnar nerve entrapment", "Cervical radiculopathy", "Thoracic outlet syndrome"],
      correctAnswer: "Carpal tunnel syndrome",
      explanation: "Thenar wasting with positive Phalen's indicates severe CTS.",
      bodyPart: "hand",
      difficulty: "medium"
    },
    {
      id: "pr_074",
      question: "36-year-old with foot pain between toes. Positive squeeze test, pain with toe dorsiflexion.",
      options: ["Plantar plate tear", "Morton's neuroma", "Metatarsalgia", "Stress fracture"],
      correctAnswer: "Plantar plate tear",
      explanation: "Toe dorsiflexion pain with squeeze test indicates plantar plate injury.",
      bodyPart: "foot",
      difficulty: "hard"
    },
    {
      id: "pr_075",
      question: "41-year-old with hip pain and limp. Positive Thomas test, weakness in hip flexion.",
      options: ["Hip flexor strain", "Hip impingement", "Labral tear", "Stress fracture"],
      correctAnswer: "Hip flexor strain",
      explanation: "Positive Thomas test with flexion weakness indicates hip flexor injury.",
      bodyPart: "hip",
      difficulty: "medium"
    },
    {
      id: "pr_076",
      question: "29-year-old with ankle pain and giving way. Positive anterior drawer, negative talar tilt.",
      options: ["ATFL tear", "CFL tear", "Deltoid ligament injury", "High ankle sprain"],
      correctAnswer: "ATFL tear",
      explanation: "Isolated anterior drawer indicates specific ATFL injury.",
      bodyPart: "ankle",
      difficulty: "hard"
    },
    {
      id: "pr_077",
      question: "48-year-old with neck pain and arm weakness. Positive Spurling's test, C6 dermatome numbness.",
      options: ["C6 radiculopathy", "C5 radiculopathy", "C7 radiculopathy", "Thoracic outlet syndrome"],
      correctAnswer: "C6 radiculopathy",
      explanation: "Positive Spurling's with C6 distribution indicates nerve root compression.",
      bodyPart: "neck",
      difficulty: "medium"
    },
    {
      id: "pr_078",
      question: "23-year-old with elbow pain and tingling in little finger. Positive elbow flexion test, Tinel's at cubital tunnel.",
      options: ["Cubital tunnel syndrome", "Medial epicondylitis", "Ulnar nerve subluxation", "Medial collateral ligament injury"],
      correctAnswer: "Cubital tunnel syndrome",
      explanation: "Ulnar nerve symptoms with positive tests indicate cubital tunnel syndrome.",
      bodyPart: "elbow",
      difficulty: "medium"
    },
    {
      id: "pr_079",
      question: "37-year-old with chronic back pain radiating to buttock. Positive Patrick's test, sacroiliac joint tenderness.",
      options: ["Sacroiliac joint dysfunction", "L5-S1 disc herniation", "Piriformis syndrome", "Facet joint arthritis"],
      correctAnswer: "Sacroiliac joint dysfunction",
      explanation: "Positive Patrick's test with SI joint tenderness indicates SIJ dysfunction.",
      bodyPart: "back",
      difficulty: "medium"
    },
    {
      id: "pr_080",
      question: "31-year-old with wrist pain on ulnar side. Positive TFCC load test, pain with ulnar deviation.",
      options: ["TFCC tear", "Ulnar impaction syndrome", "ECU tendinopathy", "Lunotriquetral ligament injury"],
      correctAnswer: "TFCC tear",
      explanation: "Positive TFCC load test indicates triangular fibrocartilage complex injury.",
      bodyPart: "wrist",
      difficulty: "hard"
    },

    // Questions 81-100: Expert diagnostic mastery
    {
      id: "pr_081",
      question: "26-year-old tennis player with wrist pain during backhand. Pain over dorsal wrist, positive scapholunate ballottement.",
      options: ["Scapholunate ligament injury", "TFCC tear", "De Quervain's tenosynovitis", "Intersection syndrome"],
      correctAnswer: "Scapholunate ligament injury",
      explanation: "Dorsal wrist pain with positive ballottement indicates SL ligament injury.",
      bodyPart: "wrist",
      difficulty: "hard"
    },
    {
      id: "pr_082",
      question: "54-year-old with shoulder pain and night symptoms. Positive Neer's sign, painful arc 60-120°.",
      options: ["Subacromial impingement", "Rotator cuff tear", "Frozen shoulder", "AC joint arthritis"],
      correctAnswer: "Subacromial impingement",
      explanation: "Classic impingement signs with painful arc indicate subacromial pathology.",
      bodyPart: "shoulder",
      difficulty: "medium"
    },
    {
      id: "pr_083",
      question: "19-year-old gymnast with back pain during extension. Positive single-leg extension test, L5 pars defect on imaging.",
      options: ["Spondylolysis", "Disc herniation", "Facet joint dysfunction", "Muscle strain"],
      correctAnswer: "Spondylolysis",
      explanation: "Extension pain with pars defect indicates spondylolysis.",
      bodyPart: "back",
      difficulty: "hard"
    },
    {
      id: "pr_084",
      question: "43-year-old with knee pain and clicking during squatting. Positive McMurray's test, joint line tenderness.",
      options: ["Meniscal tear", "Patellofemoral pain", "IT band syndrome", "Patellar tendinopathy"],
      correctAnswer: "Meniscal tear",
      explanation: "Mechanical symptoms with positive McMurray's indicate meniscal pathology.",
      bodyPart: "knee",
      difficulty: "medium"
    },
    {
      id: "pr_085",
      question: "35-year-old with chronic ankle instability and lateral ankle pain. Positive anterior drawer, peroneal weakness.",
      options: ["Chronic ankle instability with peroneal weakness", "Peroneal tendon tear", "Subtalar instability", "Lateral ankle impingement"],
      correctAnswer: "Chronic ankle instability with peroneal weakness",
      explanation: "Combination of instability and peroneal weakness indicates complex CAI.",
      bodyPart: "ankle",
      difficulty: "hard"
    },
    {
      id: "pr_086",
      question: "28-year-old climber with finger pain and swelling. Positive bowstring test, tender A2 pulley.",
      options: ["A2 pulley strain", "Flexor tendon rupture", "Trigger finger", "Collateral ligament injury"],
      correctAnswer: "A2 pulley strain",
      explanation: "Bowstring test and A2 tenderness indicate pulley injury in climber.",
      bodyPart: "finger",
      difficulty: "hard"
    },
    {
      id: "pr_087",
      question: "46-year-old with hip pain and limited flexion. Positive FABER test, groin pain with internal rotation.",
      options: ["Hip osteoarthritis", "Labral tear", "Hip impingement", "Adductor strain"],
      correctAnswer: "Hip osteoarthritis",
      explanation: "Limited motion with groin pain indicates hip joint pathology.",
      bodyPart: "hip",
      difficulty: "medium"
    },
    {
      id: "pr_088",
      question: "22-year-old with foot pain during push-off phase of running. Pain over 1st MTP joint, limited dorsiflexion.",
      options: ["Hallux rigidus", "Hallux valgus", "Sesamoiditis", "Turf toe"],
      correctAnswer: "Hallux rigidus",
      explanation: "Limited MTP dorsiflexion with pain indicates hallux rigidus.",
      bodyPart: "foot",
      difficulty: "hard"
    },
    {
      id: "pr_089",
      question: "39-year-old with lateral elbow pain and weak wrist extension. Positive middle finger test, pain 5cm distal to lateral epicondyle.",
      options: ["Radial tunnel syndrome", "Lateral epicondylitis", "PIN syndrome", "Supinator syndrome"],
      correctAnswer: "Radial tunnel syndrome",
      explanation: "Middle finger test with distal pain indicates radial tunnel syndrome.",
      bodyPart: "elbow",
      difficulty: "hard"
    },
    {
      id: "pr_090",
      question: "57-year-old with progressive shoulder weakness. Positive horn blower's sign, weakness in external rotation.",
      options: ["Teres minor tear", "Infraspinatus tear", "Supraspinatus tear", "Subscapularis tear"],
      correctAnswer: "Teres minor tear",
      explanation: "Horn blower's sign indicates teres minor muscle involvement.",
      bodyPart: "shoulder",
      difficulty: "hard"
    },
    {
      id: "pr_091",
      question: "24-year-old dancer with medial knee pain. Pain along pes anserine insertion, tender 2cm below joint line.",
      options: ["Pes anserine bursitis", "MCL sprain", "Medial meniscus tear", "Saphenous nerve entrapment"],
      correctAnswer: "Pes anserine bursitis",
      explanation: "Pes anserine location with specific tenderness indicates bursitis.",
      bodyPart: "knee",
      difficulty: "medium"
    },
    {
      id: "pr_092",
      question: "48-year-old with chronic neck pain and headaches. Positive upper cervical flexion test, suboccipital tenderness.",
      options: ["Upper cervical dysfunction", "Cervicogenic headache", "Tension headache", "Migraine"],
      correctAnswer: "Upper cervical dysfunction",
      explanation: "Upper cervical tests and suboccipital findings indicate C1-C2 dysfunction.",
      bodyPart: "neck",
      difficulty: "hard"
    },
    {
      id: "pr_093",
      question: "33-year-old with thumb pain at base. Positive CMC grind test, pain with jar opening.",
      options: ["CMC arthritis", "De Quervain's tenosynovitis", "Scaphoid fracture", "Trigger thumb"],
      correctAnswer: "CMC arthritis",
      explanation: "CMC grind test with functional limitation indicates arthritis.",
      bodyPart: "thumb",
      difficulty: "medium"
    },
    {
      id: "pr_094",
      question: "27-year-old with lower back pain after deadlifting. Positive prone instability test, pain with lumbar extension.",
      options: ["Lumbar segmental instability", "Disc herniation", "Facet joint dysfunction", "Muscle strain"],
      correctAnswer: "Lumbar segmental instability",
      explanation: "Positive instability test indicates segmental control deficit.",
      bodyPart: "back",
      difficulty: "hard"
    },
    {
      id: "pr_095",
      question: "41-year-old with heel pain and morning stiffness. Windlass test positive, pain with passive big toe extension.",
      options: ["Plantar fasciitis", "Achilles tendinopathy", "Calcaneal bursitis", "Tarsal tunnel syndrome"],
      correctAnswer: "Plantar fasciitis",
      explanation: "Positive windlass test specifically indicates plantar fascia involvement.",
      bodyPart: "heel",
      difficulty: "medium"
    },
    {
      id: "pr_096",
      question: "18-year-old volleyball player with shoulder pain during spiking. Positive O'Brien's test, pain deep in shoulder.",
      options: ["SLAP tear", "Rotator cuff tear", "Anterior instability", "Impingement syndrome"],
      correctAnswer: "SLAP tear",
      explanation: "O'Brien's test indicates superior labral anterior-posterior tear.",
      bodyPart: "shoulder",
      difficulty: "hard"
    },
    {
      id: "pr_097",
      question: "52-year-old with progressive hand deformity. Swan neck deformity of fingers, boutonniere deformity.",
      options: ["Rheumatoid arthritis", "Osteoarthritis", "Psoriatic arthritis", "Systemic lupus erythematosus"],
      correctAnswer: "Rheumatoid arthritis",
      explanation: "Classic RA deformities indicate advanced inflammatory arthritis.",
      bodyPart: "hand",
      difficulty: "hard"
    },
    {
      id: "pr_098",
      question: "34-year-old with lateral hip pain during running. Positive single-leg squat test, weak hip abductors.",
      options: ["Gluteus medius tendinopathy", "IT band syndrome", "Greater trochanteric pain syndrome", "Hip labral tear"],
      correctAnswer: "Gluteus medius tendinopathy",
      explanation: "Single-leg squat test with weakness indicates gluteus medius pathology.",
      bodyPart: "hip",
      difficulty: "hard"
    },
    {
      id: "pr_099",
      question: "26-year-old with foot pain during cutting movements. Lisfranc joint tenderness, positive plantar flexion test.",
      options: ["Lisfranc injury", "Midfoot sprain", "Navicular stress fracture", "Plantar fasciitis"],
      correctAnswer: "Lisfranc injury",
      explanation: "Lisfranc joint pain with positive testing indicates midfoot injury.",
      bodyPart: "foot",
      difficulty: "hard"
    },
    {
      id: "pr_100",
      question: "45-year-old with progressive elbow pain and deformity. Positive lateral pivot shift test of elbow, posterolateral instability.",
      options: ["Posterolateral rotatory instability", "Lateral epicondylitis", "Radial head fracture", "Lateral collateral ligament tear"],
      correctAnswer: "Posterolateral rotatory instability",
      explanation: "Lateral pivot shift test indicates complex posterolateral instability.",
      bodyPart: "elbow",
      difficulty: "hard"
    }
  ];

  // Create the content structure for Pattern Recognition
  const patternRecognitionContent = {
    patternRecognition: {
      questions: patternRecognitionQuestions,
      gameRules: {
        totalQuestions: 100,
        timeLimit: 300, // 5 minutes in seconds
        gameOverOnWrong: true,
        scoreCalculation: "consecutive_correct_answers",
        maxScore: 100
      },
      instructions: [
        "You have 5 minutes to answer as many questions correctly as possible",
        "Questions must be answered consecutively - one wrong answer ends the game",
        "Your score equals the number of consecutive correct answers",
        "Maximum possible score is 100 points",
        "Click 'Start Challenge' when ready to begin"
      ]
    }
  };

  // Update the game content for competition ID 107 (Pattern Recognition)
  await db
    .update(gameContent)
    .set({
      content: patternRecognitionContent
    })
    .where(eq(gameContent.competitionId, 107));

  console.log('✅ Pattern Recognition content updated successfully!');
  console.log(`📝 Generated ${patternRecognitionQuestions.length} multiple choice questions`);
  console.log('🎯 Game-over mechanics implemented - wrong answer ends game');
  console.log('⏱️ 5-minute time limit set');
  console.log('🏆 Score = consecutive correct answers (max 100)');
}

// Run the generation
generatePatternRecognitionContent()
  .then(() => {
    console.log('Pattern Recognition content generation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error generating Pattern Recognition content:', error);
    process.exit(1);
  });