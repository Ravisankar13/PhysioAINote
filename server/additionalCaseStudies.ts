import { AICaseStudy } from "./aiCaseStudyGenerator";

export const additionalCaseStudies: Omit<AICaseStudy, 'id' | 'createdAt'>[] = [
  // SHOULDER - Additional cases
  {
    userId: 1,
    title: "Competitive Swimmer with Deep Shoulder Pain",
    patientDescription: "A 22-year-old competitive freestyle swimmer presents with right shoulder pain that has gradually worsened over the past 2 months.",
    history: "Pain initially only present after intense training sessions but now occurs during swimming. Reports 'clicking' and 'catching' with certain movements. No improvement with rest or NSAIDs.",
    presentingSymptoms: "Deep-seated shoulder pain, worse with overhead activities and pressing movements. Reports occasional 'catching' sensation and loss of power during the pull phase of freestyle stroke.",
    vitalSigns: "BP: 120/70, HR: 62, Temp: 36.6°C, RR: 14",
    bodyPart: "shoulder",
    complexity: "advanced",
    hiddenFindings: {
      strength: "5/5 strength in all planes but pain with resisted forward flexion and resisted abduction. Pain with resisted biceps testing.",
      palpation: "Tenderness over the superior labrum and biceps anchor. Minimal tenderness over rotator cuff insertions.",
      specialTests: "Positive O'Brien's test. Positive anterior slide test. Positive Speed's test. Equivocal results on dynamic stability tests.",
      rangeOfMotion: "Full passive ROM. Pain at end-range of forward flexion and abduction. Pain with combined movements of abduction and external rotation.",
      additionalObservations: "Good scapular control. No obvious scapular dyskinesis. Good muscle development consistent with competitive swimmer."
    },
    correctDiagnosis: "Superior Labrum Anterior to Posterior (SLAP) Lesion",
    differentialDiagnoses: [
      "Rotator Cuff Tendinopathy", 
      "Biceps Tendinopathy", 
      "Subacromial Impingement Syndrome", 
      "Glenohumeral Instability",
      "Posterior Capsular Tightness"
    ],
    correctAssessmentApproach: [
      "Special tests for labral pathology (O'Brien's, anterior slide, Speed's, clunk)",
      "Assessment of throwing/swimming mechanics",
      "Strength testing throughout ROM with attention to pain responses",
      "Stability and proprioception assessment",
      "Thoracic and cervical screening",
      "Consider MRI arthrogram for definitive diagnosis"
    ],
    correctTreatmentApproach: "Initial management includes relative rest from aggravating activities, particularly overhead swimming strokes. Implement targeted rotator cuff and scapular strengthening, emphasizing external rotation and lower trapezius activation. Progressive rehabilitation should address posterior capsule mobility, rotator cuff coordination, and core strength. Gradual return to swimming with stroke modification and careful monitoring. Referral for orthopedic consultation to discuss surgical options may be necessary if conservative management fails after 8-12 weeks.",
    researchBasis: [
      "Kibler WB, Sciascia A. (2020). The shoulder at risk: scapular dyskinesis and altered glenohumeral rotation. Operative Techniques in Sports Medicine, 28(1).",
      "Wilk KE, Hooks TR. (2016). The painful long head of the biceps brachii: nonoperative treatment approaches. Clinics in Sports Medicine, 35(1), 75-92."
    ],
    expertSources: ["Ben Kibler", "Ann Cools", "George Davies"]
  },
  {
    userId: 1,
    title: "Young Gymnast with Bilateral Shoulder 'Looseness'",
    patientDescription: "A 16-year-old female gymnast reports bilateral shoulder 'looseness' and intermittent pain during training, worse on the right.",
    history: "Long-standing history of shoulder hypermobility. Recent increase in training intensity for upcoming competition has exacerbated symptoms. No specific injury event. Has general joint hypermobility in other areas.",
    presentingSymptoms: "Describes sensation of shoulder 'slipping' during handstands and uneven bar routines. Intermittent pain (3-6/10) after training. Occasional night pain disrupting sleep.",
    vitalSigns: "BP: 115/68, HR: 58, Temp: 36.7°C, RR: 14",
    bodyPart: "shoulder",
    complexity: "advanced",
    hiddenFindings: {
      strength: "5/5 strength in all shoulder movements but poor endurance in rotator cuff and scapular stabilizers. Reduced force couple coordination.",
      palpation: "Minimal tenderness. Increased translation of humeral head in all directions during palpation assessment.",
      specialTests: "Positive sulcus sign (2+ bilaterally). Positive anterior and posterior load and shift tests. Positive apprehension with reassurance test. Beighton score 7/9 indicating generalized joint hypermobility.",
      rangeOfMotion: "Excessive ROM in all directions. External rotation >110° bilaterally. Anterior and posterior glenohumeral translations grade 2+ in all directions.",
      additionalObservations: "Poor neuromuscular control during dynamic movements. Scapular dyskinesis evident during arm elevation (type 2 pattern). Can voluntarily subluxate shoulder in multiple directions."
    },
    correctDiagnosis: "Multidirectional Instability with Generalized Joint Hypermobility",
    differentialDiagnoses: [
      "Traumatic Shoulder Instability", 
      "SLAP Lesion", 
      "Functional Scapular Dyskinesis", 
      "Ehlers-Danlos Syndrome",
      "Bankart Lesion"
    ],
    correctAssessmentApproach: [
      "Comprehensive instability assessment (load and shift, sulcus, apprehension)",
      "Assessment of generalized joint hypermobility (Beighton score)",
      "Neuromuscular control assessment during functional activities",
      "Detailed scapular assessment in both static and dynamic conditions",
      "Proprioception and kinesthetic awareness testing",
      "Assessment of sport-specific demands and provocative positions"
    ],
    correctTreatmentApproach: "Conservative management is the primary approach, focusing on neuromuscular control rather than stretching. Implement comprehensive rotator cuff and scapular strengthening program with emphasis on endurance and motor control. Progressive exercises should include closed-chain stability work, rhythmic stabilization, and proprioceptive training. Education on avoiding end-range positions during gymnastics activities and potential modification of certain techniques. Collaboration with coaches on training load management. Consider kinesio taping or temporary bracing for competitions. Surgery is generally reserved for cases that fail 6-12 months of dedicated rehabilitation.",
    researchBasis: [
      "Warby SA, et al. (2018). Rehabilitation after multidirectional instability of the shoulder: a systematic review. Physical Therapy in Sport, 32, 80-90.",
      "Cools AM, et al. (2020). Rehabilitation of scapular dyskinesis: from the office worker to the elite overhead athlete. British Journal of Sports Medicine, 54(8)."
    ],
    expertSources: ["Ann Cools", "Jeremy Lewis", "W. Ben Kibler"]
  },
  // KNEE - Additional cases
  {
    userId: 1,
    title: "Patellofemoral Pain Syndrome in a Runner",
    patientDescription: "A 28-year-old female recreational runner presents with bilateral anterior knee pain, worse on the left, that has developed over the past 6 weeks.",
    history: "Recently increased running mileage in preparation for a half marathon. Pain began after changing to new running shoes. Pain is worse when running downhill or descending stairs. Minimal pain at rest but significant after runs.",
    presentingSymptoms: "Diffuse anterior knee pain described as 'achy' around and behind kneecap (4/10 at rest, 7/10 with activity). Reports occasional giving way sensation when descending stairs.",
    vitalSigns: "BP: 118/72, HR: 62, Temp: 36.7°C, RR: 14",
    bodyPart: "knee",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4-/5 hip abduction strength bilaterally. 4/5 hip external rotation. 5/5 quadriceps but pain with resisted knee extension. Relatively stronger quadriceps compared to hamstrings.",
      palpation: "Tenderness along medial and lateral facets of patella. Pain with patellar compression and mobilization. No joint line tenderness.",
      specialTests: "Positive patellar compression test. Mild lateral patellar tracking during dynamic squat. Negative meniscal tests (McMurray's, Apley's).",
      rangeOfMotion: "Full active and passive ROM. Pain at end range of flexion (>120°) with compression.",
      additionalObservations: "Increased Q-angle bilaterally (20° left, 18° right). Excessive pronation during stance phase. Dynamic knee valgus during single-leg squat. Poor control during step-down task."
    },
    correctDiagnosis: "Patellofemoral Pain Syndrome with Dynamic Malalignment",
    differentialDiagnoses: [
      "Patellar Tendinopathy", 
      "Fat Pad Impingement", 
      "Medial Plica Syndrome", 
      "Early Patellofemoral Osteoarthritis",
      "Iliotibial Band Syndrome"
    ],
    correctAssessmentApproach: [
      "Dynamic movement assessment (single leg squat, step down)",
      "Patellar mobility and tracking assessment",
      "Hip strength assessment (particularly abductors and external rotators)",
      "Running gait analysis",
      "Foot biomechanics and footwear assessment",
      "Training load analysis (recent changes in volume/intensity)"
    ],
    correctTreatmentApproach: "Initial management includes temporary reduction in running volume and avoidance of aggravating activities (especially downhill running and stairs). Implement progressive strengthening of hip abductors, external rotators, and quadriceps with emphasis on neuromuscular control during functional movements. Address movement patterns with motor control training for single-leg loading tasks. Consider appropriate footwear recommendations or orthoses if significant foot pronation is contributing. Gradual return to running program with focus on proper form and avoidance of training errors (no more than 10% weekly increase in volume).",
    researchBasis: [
      "Collins NJ, et al. (2018). 2018 Consensus statement on exercise therapy and physical interventions for patellofemoral pain. British Journal of Sports Medicine, 52(18), 1170-1178.",
      "Neal BS, et al. (2016). Runners with patellofemoral pain have altered biomechanics which targeted interventions can modify: a systematic review and meta-analysis. Gait & Posture, 45, 69-82."
    ],
    expertSources: ["Kay Crossley", "Christian Barton", "Jenny McConnell"]
  },
  {
    userId: 1,
    title: "Acute ACL Rupture in Soccer Player",
    patientDescription: "A 19-year-old male soccer player presents with acute right knee injury sustained during a match 2 days ago.",
    history: "Injured while changing direction and being tackled simultaneously. Heard a 'pop' and immediate pain. Unable to continue playing. Significant swelling developed within hours. Currently using crutches for ambulation.",
    presentingSymptoms: "Severe pain (7/10) around the knee, particularly with any movement. Significant swelling limiting motion. Reports sensation of instability and fear of bearing weight.",
    vitalSigns: "BP: 126/74, HR: 78, Temp: 36.8°C, RR: 16",
    bodyPart: "knee",
    complexity: "advanced",
    hiddenFindings: {
      strength: "Limited by pain and apprehension. Attempts at quadriceps contraction show significant inhibition. Unable to perform straight leg raise without significant pain.",
      palpation: "Large effusion. Tenderness over medial joint line and lateral femoral condyle. Pain with palpation along medial collateral ligament.",
      specialTests: "Positive Lachman test with soft endpoint. Positive anterior drawer test. Unable to perform pivot shift due to pain and guarding. Limited assessment of collaterals due to pain.",
      rangeOfMotion: "Limited active and passive ROM: 15-80° due to pain and effusion.",
      additionalObservations: "Significant quadriceps atrophy already evident compared to left. Ecchymosis developing in posterior knee. Antalgic gait with crutches, avoiding weight bearing on right."
    },
    correctDiagnosis: "Complete ACL Rupture with Possible Associated Meniscal and MCL Injury",
    differentialDiagnoses: [
      "Meniscal Tear", 
      "MCL Sprain", 
      "Patellar Dislocation", 
      "Tibial Plateau Fracture",
      "PCL Injury"
    ],
    correctAssessmentApproach: [
      "Limited initial assessment due to acute presentation",
      "Effusion measurement and monitoring",
      "Gentle ligamentous stability tests as tolerated",
      "Assessment of ability to activate quadriceps",
      "ROM assessment within pain limits",
      "Urgent referral for MRI to confirm diagnosis and assess associated structures"
    ],
    correctTreatmentApproach: "Acute management with PEACE & LOVE approach (Protection, Elevation, Avoid anti-inflammatories, Compression, Education & Load, Optimism, Vascularization, Exercise). Referral for orthopedic consultation to discuss surgical vs. conservative management options. Pre-habilitation should focus on effusion control, restoration of full passive extension, quadriceps activation, and maintenance of cardiovascular fitness through modified activities. Education about the recovery timeline and expectations is essential. Post-surgical rehabilitation (if chosen) follows a criterion-based progression focusing on strength, neuromuscular control, and gradual return to sport-specific activities, typically taking 9-12 months for full return to play.",
    researchBasis: [
      "Filbay SR, Grindem H. (2019). Evidence-based recommendations for the management of anterior cruciate ligament (ACL) rupture. Best Practice & Research Clinical Rheumatology, 33(1), 33-47.",
      "van Melick N, et al. (2016). Evidence-based clinical practice update: practice guidelines for anterior cruciate ligament rehabilitation based on a systematic review and multidisciplinary consensus. British Journal of Sports Medicine, 50(24), 1506-1515."
    ],
    expertSources: ["Lynn Snyder-Mackler", "Timothy Hewett", "Lars Engebretsen"]
  },
  // NECK - Additional cases
  {
    userId: 1,
    title: "Whiplash Associated Disorder Following MVA",
    patientDescription: "A 34-year-old female presenting with neck, headache, and shoulder pain following a rear-end motor vehicle accident 10 days ago.",
    history: "Was stopped at traffic light when hit from behind at moderate speed. Immediate neck pain that worsened over subsequent 24-48 hours. Visited emergency department where X-rays showed no fractures. Pain has not improved since accident.",
    presentingSymptoms: "Constant neck pain (6/10) with intermittent shooting pain into shoulders bilaterally. Headaches at base of skull. Dizziness with quick head movements. Difficulty sleeping due to pain.",
    vitalSigns: "BP: 135/82, HR: 88, Temp: 36.7°C, RR: 18",
    bodyPart: "neck",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "5/5 strength in all upper limb myotomes but limited by pain. Reduced endurance in deep neck flexors. Poor scapular control with upper trapezius dominance.",
      palpation: "Significant tenderness over cervical paraspinals, upper trapezius, and levator scapulae bilaterally. Tender over facet joints C4-C6.",
      specialTests: "Negative Upper Limb Tension Tests. Reproduction of dizziness with upper cervical rotation. Positive cervical quadrant test. Negative vertebral artery testing.",
      rangeOfMotion: "All movements reduced and painful: flexion 30°, extension 20° (most limited), rotation 40° bilaterally, side flexion 25° bilaterally. Pain at end ranges of all movements.",
      additionalObservations: "Increased muscle guarding with movement. Forward head posture. Elevated stress and anxiety levels about recovery. Fear-avoidance behaviors evident during assessment."
    },
    correctDiagnosis: "Whiplash Associated Disorder (WAD) Grade II",
    differentialDiagnoses: [
      "Cervical Facet Joint Sprain", 
      "Cervicogenic Headache", 
      "Cervical Disc Herniation", 
      "Thoracic Outlet Syndrome",
      "Post-Concussion Syndrome"
    ],
    correctAssessmentApproach: [
      "Detailed neck ROM assessment with symptom response",
      "Neurological screening (dermatomes, myotomes, reflexes)",
      "Vestibular assessment if dizziness is prominent",
      "Psychological screening (fear-avoidance, catastrophizing)",
      "Functional capacity assessment",
      "Prognostic risk factor identification (using clinical prediction rules)"
    ],
    correctTreatmentApproach: "Education is the cornerstone of treatment, emphasizing expected good recovery and addressing misconceptions about whiplash injuries. Gentle active mobilization rather than rest, with progressive return to normal activities as tolerated. Specific therapeutic interventions include neck and scapular motor control exercises, low-load endurance training for deep neck flexors, and manual therapy as indicated for pain relief. Address psychological factors through appropriate pain neuroscience education and gradual graded exposure to feared movements. Coordinate with other providers regarding return to work planning. Monitor for yellow flags that may indicate transition to chronic pain state.",
    researchBasis: [
      "Côté P, et al. (2016). Non-pharmacological management of persistent headaches associated with neck pain: A clinical practice guideline from the Ontario Protocol for Traffic Injury Management (OPTIMa) Collaboration. European Journal of Pain, 23(6), 1051-1070.",
      "Sterling M, et al. (2019). Physical and psychological factors predict outcome following whiplash injury. Pain, 150(3), 512-521."
    ],
    expertSources: ["Michele Sterling", "Gwendolen Jull", "Deborah Falla"]
  },
  {
    userId: 1,
    title: "Cervicogenic Headache with Upper Cervical Dysfunction",
    patientDescription: "A 42-year-old female executive with a 6-month history of progressive unilateral headaches and neck stiffness.",
    history: "Works long hours at computer. Headaches initially infrequent but now occurring 4-5 days/week. Always start at the base of the skull on right side and progress forward. Minimal response to OTC pain medications. Reports increased stress at work.",
    presentingSymptoms: "Right-sided headache radiating from occiput to temple and behind eye (5-8/10). Associated neck stiffness and occasional dizziness with quick head turns. Symptoms worsen throughout workday.",
    vitalSigns: "BP: 128/78, HR: 72, Temp: 36.6°C, RR: 16",
    bodyPart: "neck",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4+/5 deep neck flexor strength with poor endurance. 5/5 strength in all upper limb myotomes. Poor scapular control with elevated shoulders at rest.",
      palpation: "Significant tenderness over right C1-C2 facet joint and right suboccipital muscles. Hypertonic right upper trapezius and levator scapulae. Trigger points in right sternocleidomastoid.",
      specialTests: "Positive manual examination of right C1-C2 joint (rotation restriction). Positive cervical flexion-rotation test to the right. Reproduction of headache with sustained pressure over right C1-C2 facet. Negative neurological provocation tests.",
      rangeOfMotion: "General cervical ROM mildly restricted in all planes. Significant restriction in upper cervical rotation to the right during flexion-rotation test (approximately 15° versus 40° to the left).",
      additionalObservations: "Forward head posture with rounded shoulders. Increased tone in accessory breathing muscles. Headache reproduced with sustained upper cervical extension."
    },
    correctDiagnosis: "Cervicogenic Headache with Upper Cervical Joint Dysfunction",
    differentialDiagnoses: [
      "Tension-Type Headache", 
      "Migraine with Aura", 
      "Temporomandibular Disorder", 
      "Occipital Neuralgia",
      "Vestibular Dysfunction"
    ],
    correctAssessmentApproach: [
      "Detailed headache history and pattern analysis",
      "Upper cervical mobility assessment (including flexion-rotation test)",
      "Deep neck flexor endurance testing",
      "Posture assessment in working positions",
      "Cervical and scapular muscle strength and control",
      "Differential diagnosis of headache types (using ICHD-3 criteria)"
    ],
    correctTreatmentApproach: "A multimodal approach includes gentle mobilization of the upper cervical spine, particularly C1-C2 segments, with focus on restoring normal arthrokinematics. Implement specific training of deep neck flexors and scapular stabilizers. Address postural dysfunction through ergonomic assessment and modification of workstation. Soft tissue techniques for hypertonic muscles and trigger points. Education on self-management strategies, including regular breaks from prolonged postures and home exercises. Collaboration with other health providers if stress management or psychological support is indicated.",
    researchBasis: [
      "Liang Z, et al. (2019). Neck exercises for cervicogenic headache: a systematic review and meta-analysis. Physical Therapy, 99(12), 1551-1568.",
      "Szikszay TM, et al. (2018). Effectiveness of manual therapy on pain and movement in cervicogenic headache: a systematic review. Headache, 58(7), 1126-1143."
    ],
    expertSources: ["Gwendolen Jull", "Toby Hall", "Dean Watson"]
  },
  // BACK - Additional cases
  {
    userId: 1,
    title: "Lumbar Disc Herniation with Radiculopathy",
    patientDescription: "A 38-year-old male warehouse worker presents with acute low back pain radiating to the left leg after lifting a heavy box 5 days ago.",
    history: "Felt immediate 'pop' in lower back while lifting and twisting. Initially just back pain, but leg symptoms developed the following day. Symptoms worsen with sitting, bending, and coughing. Unable to work since injury.",
    presentingSymptoms: "Severe low back pain (7/10) with sharp, shooting pain radiating down left posterior thigh and lateral calf to the foot (8/10). Reports tingling in left lateral foot and difficulty finding comfortable positions.",
    vitalSigns: "BP: 136/84, HR: 82, Temp: 36.7°C, RR: 18",
    bodyPart: "back",
    complexity: "advanced",
    hiddenFindings: {
      strength: "4/5 weakness in left ankle dorsiflexion and great toe extension. All other myotomes 5/5 strength bilaterally.",
      palpation: "Tenderness over L4-L5 and L5-S1 levels centrally and left paravertebrally. Increased muscle tone in left lumbar paraspinals with palpable spasm.",
      specialTests: "Positive left straight leg raise at 40° with reproduction of leg symptoms. Positive slump test on left. Positive well leg raise test with left leg symptoms. Decreased left ankle reflex (1+ compared to 2+ on right).",
      rangeOfMotion: "Severely limited forward flexion (20° with increased leg pain). Extension 10° increases back pain. Side bending restricted and painful bilaterally, worse to the right. Rotation minimally limited.",
      additionalObservations: "Antalgic gait with reduced weight-bearing on left. Standing with shifted posture away from left side. Altered sensation to light touch along left L5 dermatome (lateral leg and dorsum of foot)."
    },
    correctDiagnosis: "L5-S1 Disc Herniation with Left L5 Radiculopathy",
    differentialDiagnoses: [
      "Lumbar Facet Syndrome", 
      "Sacroiliac Joint Dysfunction", 
      "Piriformis Syndrome", 
      "Lumbar Spinal Stenosis",
      "Cauda Equina Syndrome (rule out)"
    ],
    correctAssessmentApproach: [
      "Comprehensive neurological examination (myotomes, dermatomes, reflexes)",
      "Neural tension tests (SLR, slump, femoral nerve stretch)",
      "Assessment of centralization/peripheralization with repeated movements",
      "Red flag screening for cauda equina syndrome",
      "Functional assessment of daily activities and positions of relief",
      "Assessment of psychosocial factors (yellow flags)"
    ],
    correctTreatmentApproach: "Initial management focuses on pain control through relative rest, positions of comfort, and appropriate medication as prescribed. Early intervention should include education about the favorable natural history of disc herniation and the importance of gentle movement. Implement directional preference exercises based on McKenzie assessment (likely extension bias in this case). Progress to neural mobilization as tolerated, core stabilization training, and gradual return to functional activities. Advise on proper lifting mechanics and workplace modifications. Referral for surgical consultation may be indicated if severe symptoms persist beyond 6 weeks or demonstrate progressive neurological deficit.",
    researchBasis: [
      "Alrwaily M, et al. (2018). Clinical decision making for physical therapists in patients with low back pain: clinimetrics of central pain mechanisms and lumbar nerve root compression. Journal of Orthopaedic & Sports Physical Therapy, 48(11), 895-902.",
      "Pourahmadi MR, et al. (2019). Effectiveness of slump stretching on low back pain: a systematic review and meta-analysis. Pain Medicine, 20(2), 378-396."
    ],
    expertSources: ["Stuart McGill", "Mark Hancock", "Julie Fritz"]
  },
  {
    userId: 1,
    title: "Chronic Low Back Pain with Movement Control Impairment",
    patientDescription: "A 45-year-old female office worker with recurrent low back pain episodes over 3 years, current exacerbation began 2 weeks ago.",
    history: "Original injury occurred while gardening. Has had 5-6 episodes since then, each lasting 2-3 weeks. Current episode began without clear trigger. Previous treatments include massage, heat, and general exercises with temporary relief.",
    presentingSymptoms: "Dull, aching pain across lower back (5/10), worse on right side. Increases with prolonged sitting and bending activities. Morning stiffness lasting 30-45 minutes. No leg symptoms.",
    vitalSigns: "BP: 122/76, HR: 68, Temp: 36.7°C, RR: 14",
    bodyPart: "back",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 strength in gluteus medius bilaterally. Poor endurance in deep core muscles with early fatigue during testing. Normal strength in all lower limb myotomes.",
      palpation: "Tenderness over right L4-L5 facet joint and right lumbar paraspinals. Minimal tenderness over SI joints. Hypertonicity in right quadratus lumborum.",
      specialTests: "Negative neural tension tests. Negative sacroiliac joint provocation tests. Pain provocation with sustained flexion. Positive prone instability test. Failed load transfer during active straight leg raise test.",
      rangeOfMotion: "Full but painful lumbar flexion with poor movement control (early lumbar motion). Extension 20° with minimal pain at end range. Rotation and side flexion within normal limits with minimal pain.",
      additionalObservations: "Poor body awareness during movement. Uncontrolled motion in lumbar spine during hip movements. Excessive lumbar flexion during forward bending. Demonstrates fear-avoidance beliefs regarding certain movements."
    },
    correctDiagnosis: "Chronic Low Back Pain with Flexion Movement Control Impairment",
    differentialDiagnoses: [
      "Lumbar Facet Joint Dysfunction", 
      "Lumbar Instability", 
      "Myofascial Pain Syndrome", 
      "Sacroiliac Joint Dysfunction",
      "Early-Stage Lumbar Degenerative Disc Disease"
    ],
    correctAssessmentApproach: [
      "Movement control assessment during functional tasks",
      "Specific motor control tests (e.g., active straight leg raise, prone knee bend)",
      "Lumbar stability tests in various positions",
      "Assessment of muscle activation patterns",
      "Screening for psychosocial factors (fear-avoidance, catastrophizing)",
      "Assessment of daily activities and ergonomics"
    ],
    correctTreatmentApproach: "Treatment should focus on improving movement control and body awareness rather than simply increasing strength or flexibility. Implement specific motor control exercises targeting the identified movement impairment (flexion control), starting with basic isolated contractions and progressing to functional movements. Education about pain mechanisms and correction of misconceptions is essential. Gradually incorporate strength training for key muscle groups (core, gluteals) and address ergonomic factors in the workplace. Emphasize self-management strategies and graded exposure to previously avoided movements. Consider cognitive-behavioral approaches if significant psychosocial factors are present.",
    researchBasis: [
      "O'Sullivan PB, et al. (2018). Cognitive functional therapy for disabling nonspecific chronic low back pain: multiple case-cohort study. Physical Therapy, 98(5), 408-423.",
      "Luomajoki H, et al. (2018). Movement control exercises versus general exercise to reduce disability in patients with low back pain and movement control impairment. BMC Musculoskeletal Disorders, 19(1), 1-9."
    ],
    expertSources: ["Peter O'Sullivan", "Wim Dankaerts", "Kieran O'Sullivan"]
  },
  // ANKLE - Additional cases
  {
    userId: 1,
    title: "Chronic Ankle Instability Following Repeated Sprains",
    patientDescription: "A 22-year-old male basketball player with history of multiple right ankle sprains over the past 3 years, most recent occurring 2 months ago.",
    history: "Initial sprain occurred during high school basketball. Has had 5-6 subsequent sprains, each with incomplete rehabilitation. Reports ankle 'giving way' during cutting maneuvers and occasional instability even during daily activities.",
    presentingSymptoms: "Persistent lateral ankle discomfort (3/10) that worsens during sports. Feelings of instability and lack of confidence in the ankle. Occasional swelling after activities.",
    vitalSigns: "BP: 120/70, HR: 65, Temp: 36.6°C, RR: 14",
    bodyPart: "ankle",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 strength in right ankle eversion and dorsiflexion. 4+/5 in plantarflexion. Bilateral weakness in hip abductors more pronounced on right (4/5).",
      palpation: "Tenderness over anterior talofibular ligament (ATFL) and calcaneofibular ligament (CFL). Mild thickening of lateral malleolus. No tenderness over medial ankle structures.",
      specialTests: "Positive anterior drawer test on right ankle. Positive talar tilt test. Positive single leg balance test with increased sway compared to left. Failed multiple hop tests with apprehension.",
      rangeOfMotion: "Full dorsiflexion and plantarflexion ROM. Subtle hypermobility into inversion compared to uninvolved side. Decreased inversion and eversion control during active movement.",
      additionalObservations: "Visible lateral ankle laxity during weight-bearing. Poor foot position awareness during closed-chain activities. Altered movement patterns during landing tasks with increased valgus loading."
    },
    correctDiagnosis: "Chronic Lateral Ankle Instability with Proprioceptive Deficit",
    differentialDiagnoses: [
      "Peroneal Tendinopathy", 
      "Sinus Tarsi Syndrome", 
      "Osteochondral Lesion of the Talus", 
      "Subtalar Joint Instability",
      "Anterior Impingement Syndrome"
    ],
    correctAssessmentApproach: [
      "Ligamentous stability testing (anterior drawer, talar tilt)",
      "Dynamic balance assessment (Y-Balance Test, single leg stance)",
      "Proprioception and kinesthesia evaluation",
      "Functional performance tests (hop tests, agility)",
      "Assessment of proximal joint control (hip, knee)",
      "Assessment of landing mechanics and cutting maneuvers"
    ],
    correctTreatmentApproach: "Comprehensive rehabilitation should address both mechanical and functional instability. Begin with proprioceptive training using progressive balance exercises on various surfaces with added perturbations. Implement strengthening of ankle evertors, dorsiflexors, and important proximal muscles (hip abductors). Develop specific neuromuscular control during sport-specific movements, focusing on proper landing mechanics and cutting techniques. Consider temporary bracing or taping during return to sport. Education about the importance of complete rehabilitation and potential long-term consequences of repeated sprains is essential. If instability persists despite 3-6 months of comprehensive rehabilitation, orthopedic referral for surgical consideration may be warranted.",
    researchBasis: [
      "Kosik KB, et al. (2017). Therapeutic interventions for improving self-reported function in patients with chronic ankle instability: a systematic review. British Journal of Sports Medicine, 51(2), 105-112.",
      "Donovan L, et al. (2016). Effects of ankle joint cooling on peroneal short latency response during inversion perturbation in individuals with chronic ankle instability. Journal of Electromyography and Kinesiology, 27, 90-96."
    ],
    expertSources: ["Claire Hiller", "Eamonn Delahunt", "Jay Hertel"]
  },
  {
    userId: 1,
    title: "Achilles Tendinopathy in a Recreational Runner",
    patientDescription: "A 40-year-old male recreational runner presents with progressive right heel and posterior ankle pain over the past 8 weeks.",
    history: "Increased running volume (20 to 35 miles/week) while preparing for a marathon. Initially experienced morning stiffness that resolved with activity. Now has pain during and after running. Has tried rest, ice, and OTC anti-inflammatories with minimal relief.",
    presentingSymptoms: "Pain and stiffness 2-4cm above calcaneal insertion (4/10 at rest, 7/10 during running). Morning stiffness lasting 30+ minutes. Pain decreases during warm-up but returns after prolonged activity.",
    vitalSigns: "BP: 124/78, HR: 64, Temp: 36.6°C, RR: 14",
    bodyPart: "ankle",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 plantarflexion strength on right with pain during testing. 5/5 on left. Bilateral weakness in intrinsic foot muscles.",
      palpation: "Nodular thickening of mid-portion Achilles tendon with marked tenderness. No gap palpable. Minimal tenderness at insertion site. Mild thickening of paratenon.",
      specialTests: "Painful arc sign present during active movement. Positive Royal London Hospital test. Negative Thompson test. Pain with single-leg heel raise (limited to 8 repetitions on right vs. 20+ on left).",
      rangeOfMotion: "Dorsiflexion slightly limited on right (10° vs. 15° on left). Normal plantarflexion ROM bilaterally but painful at end range on right.",
      additionalObservations: "Mild pes planus bilaterally. Excessive pronation during stance phase. Limited great toe extension. Some tendon thickening visible on comparison with unaffected side."
    },
    correctDiagnosis: "Mid-Portion Achilles Tendinopathy",
    differentialDiagnoses: [
      "Achilles Tendon Partial Tear", 
      "Retrocalcaneal Bursitis", 
      "Posterior Ankle Impingement", 
      "Sural Nerve Entrapment",
      "Plantaris Tendon Injury"
    ],
    correctAssessmentApproach: [
      "Detailed tendon palpation and Victorian Institute of Sport Assessment-Achilles (VISA-A) questionnaire",
      "Assessment of tendon reactivity to loading",
      "Single-leg heel raise capacity and pain response",
      "Foot posture and biomechanics assessment",
      "Running gait analysis when appropriate",
      "Assessment of training load and progression patterns"
    ],
    correctTreatmentApproach: "Evidence supports a progressive loading program as the cornerstone of treatment. Implement a structured heavy slow resistance training program or modified Alfredson's protocol (eccentric training) based on tendon reactivity. Temporarily modify running volume and intensity, potentially with complete rest from running for 1-2 weeks in reactive cases. Address contributing factors such as foot posture, ankle mobility, and running technique. Gradual return to running following pain-monitoring model. Consider adjunct treatments such as extracorporeal shockwave therapy if progress plateaus. Education regarding realistic timeline for recovery (typically 3-6 months) and importance of consistent loading program.",
    researchBasis: [
      "Murphy M, et al. (2018). Managing Achilles pain: a case report of using loading programmes to treat midportion Achilles tendinopathy. British Journal of Sports Medicine, 52(22), 1444-1445.",
      "Silbernagel KG, Crossley KM. (2015). A proposed return-to-sport program for patients with midportion Achilles tendinopathy: rationale and implementation. Journal of Orthopaedic & Sports Physical Therapy, 45(11), 876-886."
    ],
    expertSources: ["Karin Gravare Silbernagel", "Jill Cook", "Peter Malliaras"]
  },
  // HIP - Additional cases
  {
    userId: 1,
    title: "Femoroacetabular Impingement Syndrome in Young Adult",
    patientDescription: "A 26-year-old male recreational soccer player presents with right groin pain that has been gradually worsening over 8 months.",
    history: "Pain initially only present after soccer, now occurs during activity and occasionally with prolonged sitting. Describes 'catching' sensation with certain movements. Previously diagnosed with 'groin strain' but failed to improve with rest.",
    presentingSymptoms: "Deep anterior hip/groin pain (4/10 at rest, 7/10 with activity). Pain with prolonged sitting and when getting up after sitting. Occasional 'catching' sensation with rotation movements.",
    vitalSigns: "BP: 122/74, HR: 66, Temp: 36.7°C, RR: 14",
    bodyPart: "hip",
    complexity: "advanced",
    hiddenFindings: {
      strength: "5/5 strength in all hip movements but pain at end-range of resisted flexion and internal rotation. Bilateral weakness in deep hip external rotators compared to superficial muscles.",
      palpation: "Tenderness in right anterior hip joint line and adductor insertion. No significant tenderness over greater trochanter or ischial tuberosity.",
      specialTests: "Positive FADIR test (flexion, adduction, internal rotation) with pain reproduction. Positive FABER test with limited range compared to left side. Scour test reproduces symptoms. Negative tests for sports hernia and adductor pathology.",
      rangeOfMotion: "Limited and painful internal rotation in flexion (15° right vs. 30° left). Flexion limited to 100° with pain at end range. Other movements within normal limits.",
      additionalObservations: "Altered movement pattern with hip hiking during single leg activities. Limited hip dissociation from lumbar spine. Compensatory external rotation during squatting movements."
    },
    correctDiagnosis: "Femoroacetabular Impingement (FAI) Syndrome",
    differentialDiagnoses: [
      "Athletic Pubalgia/Sports Hernia", 
      "Adductor Tendinopathy", 
      "Iliopsoas Tendinopathy", 
      "Hip Labral Tear",
      "Early Osteoarthritis"
    ],
    correctAssessmentApproach: [
      "Hip joint provocation tests (FADIR, FABER, scour)",
      "Assessment of hip ROM with particular attention to internal rotation",
      "Hip muscle strength and activation patterns",
      "Movement quality during functional tasks (squat, step-up, single leg stance)",
      "Differentiation from other sources of groin pain",
      "Consideration of imaging (X-ray, MRI) for definitive diagnosis"
    ],
    correctTreatmentApproach: "Conservative management should be the first-line approach, focusing on activity modification to avoid painful positions (deep flexion and internal rotation). Implement targeted strengthening of hip and core muscles with emphasis on external rotators and gluteal muscles. Address movement patterns to optimize hip biomechanics and reduce impingement risk. Manual therapy techniques to improve joint mobility where restricted. Gradual return to sport with modification of high-risk movements and loads. If conservative management fails after 3-6 months of dedicated rehabilitation, referral for orthopedic consultation to discuss surgical options may be warranted.",
    researchBasis: [
      "Kemp JL, et al. (2018). Physiotherapist-led treatment for femoroacetabular impingement: a systematic review of the literature. British Journal of Sports Medicine, 52(18), 1156-1176.",
      "Reiman MP, et al. (2020). Femoroacetabular impingement surgery leads to early pain relief but minimal functional gains beyond that achieved by conservative management: a systematic review. Journal of Science and Medicine in Sport, 23(10), 925-934."
    ],
    expertSources: ["Joanne Kemp", "Kay Crossley", "Inger Mechlenburg"]
  },
  {
    userId: 1,
    title: "Gluteal Tendinopathy/Greater Trochanteric Pain Syndrome",
    patientDescription: "A 52-year-old female presents with right lateral hip pain that has been present for approximately 4 months.",
    history: "Pain developed insidiously without specific injury. Gradually worsening despite rest from her usual walking routine. Reports pain when lying on affected side and when climbing stairs. Previously tried massage and stretching without relief.",
    presentingSymptoms: "Sharp pain over lateral hip (6/10), worse with weight-bearing activities, particularly single-leg stance and stair climbing. Pain with lying on affected side at night, disrupting sleep.",
    vitalSigns: "BP: 126/76, HR: 70, Temp: 36.6°C, RR: 14",
    bodyPart: "hip",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4-/5 hip abduction strength with pain during testing. 4/5 external rotation strength. Weak gluteus medius and maximus on functional testing with poor endurance.",
      palpation: "Marked tenderness over greater trochanter, particularly at gluteus medius tendon insertion. Mild tenderness along iliotibial band. No significant tenderness over lumbar spine or SI joint.",
      specialTests: "Positive FADER test (flexion, adduction, external rotation). Positive single leg stance test with reproduction of lateral hip pain after 15 seconds. Positive resisted external derotation test. Negative hip joint provocation tests (FADIR, scour).",
      rangeOfMotion: "Full ROM in all directions with pain at end-range adduction and internal rotation. Pain with combined movements involving adduction.",
      additionalObservations: "Trendelenburg sign during single leg stance. Increased hip adduction during gait and stair climbing. Standing posture shows increased pelvic drop on affected side."
    },
    correctDiagnosis: "Gluteal Tendinopathy/Greater Trochanteric Pain Syndrome",
    differentialDiagnoses: [
      "Trochanteric Bursitis", 
      "Lumbar Radiculopathy", 
      "Hip Osteoarthritis", 
      "Iliotibial Band Syndrome",
      "Sacroiliac Joint Dysfunction"
    ],
    correctAssessmentApproach: [
      "Specific tests for gluteal tendinopathy (single leg stance, FADER)",
      "Assessment of gluteal strength and activation patterns",
      "Analysis of functional movements (gait, stairs, sit-to-stand)",
      "Hip joint assessment to rule out intra-articular pathology",
      "Lumbar spine screening",
      "Biomechanical assessment of lower limb alignment during activities"
    ],
    correctTreatmentApproach: "Initial management includes education about load management and temporary activity modification to avoid compression of the gluteal tendons (avoiding crossing legs, side-lying on affected side, prolonged sitting). Implement a progressive loading program for the gluteal tendons using isometric exercises initially, progressing to isotonic and functional exercises. Address biomechanical factors such as hip adduction during walking and functional activities. Consider temporary use of a walking stick in contralateral hand if significantly painful. Corticosteroid injection may provide short-term relief but exercise is more effective long-term. Progressive return to walking program with attention to proper biomechanics.",
    researchBasis: [
      "Mellor R, et al. (2018). Education plus exercise versus corticosteroid injection use versus a wait and see approach on global outcome and pain from gluteal tendinopathy: prospective, single blinded, randomised clinical trial. British Journal of Sports Medicine, 52(22), 1464-1472.",
      "Grimaldi A, Fearon A. (2015). Gluteal tendinopathy: integrating pathomechanics and clinical features in its management. Journal of Orthopaedic & Sports Physical Therapy, 45(11), 910-922."
    ],
    expertSources: ["Alison Grimaldi", "Angela Fearon", "Bill Vicenzino"]
  },
  // ELBOW - Additional cases
  {
    userId: 1,
    title: "Lateral Epicondylalgia in Office Worker",
    patientDescription: "A 38-year-old female office worker presents with right lateral elbow pain that has been present for approximately 3 months.",
    history: "Works in data entry requiring repetitive mouse use. Pain began gradually and has progressively worsened. Recently renovated home which involved painting and gardening. Previous treatment included rest, over-the-counter NSAIDs, and a compression band with minimal relief.",
    presentingSymptoms: "Sharp pain over lateral epicondyle (5/10 at rest, 8/10 with activity). Pain with gripping activities and lifting even light objects. Morning stiffness lasting approximately 30 minutes.",
    vitalSigns: "BP: 118/76, HR: 72, Temp: 36.6°C, RR: 14",
    bodyPart: "elbow",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "Significantly reduced pain-free grip strength on right (15kg vs. 32kg on left). 4/5 strength in wrist extensors with pain during testing. Normal strength in other muscle groups.",
      palpation: "Marked tenderness over right lateral epicondyle and proximal extensor carpi radialis brevis tendon. Minimal tenderness over radial head or posterior interosseous nerve.",
      specialTests: "Positive Cozen's test. Positive Mill's test. Positive resisted middle finger extension. Negative upper limb neural tension test. Pain exacerbated with resisted wrist extension with elbow extension.",
      rangeOfMotion: "Full active and passive ROM of elbow and wrist. Pain at end range of wrist flexion with elbow extension. No restrictions in forearm pronation/supination.",
      additionalObservations: "Poor wrist positioning during simulated keyboard and mouse tasks. Excessive wrist extension during gripping activities. Evidence of altered motor patterns with early activation of superficial wrist extensors."
    },
    correctDiagnosis: "Lateral Epicondylalgia (Tennis Elbow)",
    differentialDiagnoses: [
      "Posterior Interosseous Nerve Entrapment", 
      "Cervical Radiculopathy", 
      "Intra-articular Elbow Pathology", 
      "Radial Head Arthritis",
      "Cubital Tunnel Syndrome"
    ],
    correctAssessmentApproach: [
      "Pain-free grip strength measurement",
      "Specific provocative tests (Cozen's, Mill's, resisted extension)",
      "Assessment of work ergonomics and techniques",
      "Cervical spine screening",
      "Neurodynamic assessment to rule out neural involvement",
      "Functional assessment of problematic activities"
    ],
    correctTreatmentApproach: "Evidence supports a progressive loading program tailored to the stage of tendinopathy. Begin with education about load management and temporary modification of aggravating activities. Early-stage management may include isometric exercises to provide pain relief while building tendon capacity. Progress to concentric-eccentric loading program as symptoms allow. Address workplace ergonomics with specific adjustments to mouse and keyboard position. Manual therapy techniques including mobilization with movement may provide short-term pain relief. Consider temporary use of counterforce brace during unavoidable aggravating activities. Emphasize realistic timeframes for recovery (typically 3-6 months) and importance of consistency with the exercise program.",
    researchBasis: [
      "Coombes BK, et al. (2015). Management of lateral elbow tendinopathy: one size does not fit all. Journal of Orthopaedic & Sports Physical Therapy, 45(11), 938-949.",
      "Bisset LM, Vicenzino B. (2015). Physiotherapy management of lateral epicondylalgia. Journal of Physiotherapy, 61(4), 174-181."
    ],
    expertSources: ["Brooke Coombes", "Leanne Bissett", "Bill Vicenzino"]
  },
  {
    userId: 1,
    title: "Ulnar Collateral Ligament Sprain in Throwing Athlete",
    patientDescription: "A 17-year-old male high school baseball pitcher presents with medial elbow pain that developed during a game 2 weeks ago.",
    history: "Felt a 'pop' followed by sharp pain while throwing a curveball. Has continued to feel pain with throwing attempts since injury. Recently increased pitching volume in preparation for playoffs. No previous elbow injuries.",
    presentingSymptoms: "Pain along medial elbow (3/10 at rest, 8/10 with throwing). Reports feeling of instability during the acceleration phase of throwing. Pain worse during the late cocking and acceleration phases.",
    vitalSigns: "BP: 118/70, HR: 68, Temp: 36.6°C, RR: 14",
    bodyPart: "elbow",
    complexity: "advanced",
    hiddenFindings: {
      strength: "5/5 strength in wrist flexors but pain with resisted testing. 5/5 strength in all other muscle groups with no pain. Normal grip strength bilaterally.",
      palpation: "Significant tenderness over the ulnar collateral ligament (medial epicondyle to sublime tubercle). Mild tenderness over the flexor-pronator mass. No tenderness over ulnar nerve.",
      specialTests: "Positive moving valgus stress test with pain reproduction. Positive milking maneuver. Negative Tinel's sign at cubital tunnel. Mild laxity with valgus stress at 30° of flexion compared to uninvolved side.",
      rangeOfMotion: "Full ROM in all planes. Pain at end range of extension and with combined extension/valgus stress. Minimal pain with flexion.",
      additionalObservations: "Visible atrophy of flexor-pronator mass compared to uninvolved side. Mild carrying angle asymmetry. Altered throwing mechanics with reduced external rotation of shoulder and increased trunk rotation to compensate."
    },
    correctDiagnosis: "Grade 2 Ulnar Collateral Ligament Sprain",
    differentialDiagnoses: [
      "Flexor-Pronator Strain", 
      "Medial Epicondyle Apophysitis (in younger athletes)", 
      "Ulnar Neuritis", 
      "Medial Epicondyle Stress Fracture",
      "Valgus Extension Overload Syndrome"
    ],
    correctAssessmentApproach: [
      "Special tests for UCL integrity (moving valgus stress, milking maneuver)",
      "Assessment of medial joint stability with valgus stress test",
      "Neurological assessment of ulnar nerve",
      "Detailed ROM and strength assessment",
      "Evaluation of throwing mechanics when appropriate",
      "Consideration of imaging (MRI) for definitive diagnosis"
    ],
    correctTreatmentApproach: "Initial management includes complete rest from throwing for 4-6 weeks. Control pain and inflammation through relative rest and appropriate modalities. Implement progressive strengthening program for the flexor-pronator mass which provides dynamic support to the UCL. Address any deficits in shoulder and core strength that may contribute to increased valgus stress at the elbow. Gradually restore full, pain-free ROM. Once pain-free, implement a structured interval throwing program with careful monitoring of symptoms and mechanics. Provide education on proper throwing mechanics, pitch counts, and recovery time. For competitive pitchers with significant instability or complete tears not responding to conservative care, referral for surgical consultation may be warranted.",
    researchBasis: [
      "Erickson BJ, et al. (2016). Ulnar collateral ligament reconstruction: anatomy, indications, techniques, and outcomes. Sports Health, 8(2), 150-157.",
      "Fleisig GS, Andrews JR. (2012). Prevention of elbow injuries in youth baseball pitchers. Sports Health, 4(5), 419-424."
    ],
    expertSources: ["James Andrews", "Kevin Wilk", "Glenn Fleisig"]
  },
  // FOOT - Additional cases
  {
    userId: 1,
    title: "Plantar Fasciitis in a Runner",
    patientDescription: "A 36-year-old female recreational runner presents with right heel pain that has been present for approximately 6 weeks.",
    history: "Recently increased running mileage and switched to minimalist running shoes. Pain worst with first steps in the morning and after periods of rest. Has been self-treating with ice and rolling foot on a ball with temporary relief.",
    presentingSymptoms: "Sharp pain at medial calcaneal tuberosity (3/10 at rest, 7/10 with first steps in morning). Pain improves with walking but returns after prolonged activity or long periods of rest.",
    vitalSigns: "BP: 124/78, HR: 68, Temp: 36.7°C, RR: 14",
    bodyPart: "foot",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "5/5 strength in all ankle and foot muscle groups. Weakness in intrinsic foot muscles identified with functional testing.",
      palpation: "Marked tenderness at the medial calcaneal tuberosity and proximal plantar fascia. No significant tenderness along the length of the fascia or at its insertion at the metatarsal heads.",
      specialTests: "Positive windlass test with reproduction of heel pain. Pain with passive toe extension while palpating plantar fascia. Negative tarsal tunnel tests.",
      rangeOfMotion: "Reduced ankle dorsiflexion (5° right vs. 15° left). Limited first MTP extension. Normal ROM in all other foot and ankle joints.",
      additionalObservations: "Pes planus foot type with excessive pronation during stance phase. Tight gastrocnemius and soleus muscles bilaterally, more pronounced on right. Callus formation under second metatarsal head indicating altered weight-bearing patterns."
    },
    correctDiagnosis: "Plantar Fasciitis/Plantar Fasciopathy",
    differentialDiagnoses: [
      "Calcaneal Stress Fracture", 
      "Fat Pad Atrophy/Contusion", 
      "Tarsal Tunnel Syndrome", 
      "Baxter's Nerve Entrapment",
      "Medial Calcaneal Nerve Entrapment"
    ],
    correctAssessmentApproach: [
      "Specific provocation tests (windlass test, palpation)",
      "Assessment of ankle dorsiflexion ROM and first MTP extension",
      "Foot posture and biomechanics evaluation",
      "Running gait analysis when appropriate",
      "Assessment of intrinsic foot strength and control",
      "Lower limb muscle length assessment (particularly gastrocnemius/soleus)"
    ],
    correctTreatmentApproach: "Initial management focuses on load management and pain relief through temporary activity modification and plantar fascia-specific stretching (particularly first thing in the morning and after periods of rest). Implement foot-specific exercises to improve intrinsic muscle strength and control. Address proximal factors by incorporating calf stretching and strengthening. Consider temporary supportive footwear and/or over-the-counter orthoses to reduce strain on the plantar fascia. Night splints may be beneficial to maintain dorsiflexion during sleep. Gradual, progressive return to running with proper footwear and training load management. For recalcitrant cases, consider referral for custom orthoses or other interventions such as extracorporeal shockwave therapy.",
    researchBasis: [
      "Rathleff MS, et al. (2015). High-load strength training improves outcome in patients with plantar fasciitis: A randomized controlled trial with 12-month follow-up. Scandinavian Journal of Medicine & Science in Sports, 25(3), e292-e300.",
      "Landorf KB. (2015). Plantar heel pain and plantar fasciitis. BMJ Clinical Evidence, 11, 1111."
    ],
    expertSources: ["Michael Rathleff", "Christian Barton", "Karl Landorf"]
  },
  {
    userId: 1,
    title: "Metatarsalgia with Morton's Neuroma",
    patientDescription: "A 45-year-old female presents with pain in the ball of the right foot that has been gradually worsening over the past 4 months.",
    history: "Works as a retail salesperson requiring prolonged standing. Recently started wearing new high-heeled shoes for work. Reports burning and shooting pain between 3rd and 4th toes. Removes shoes whenever possible for relief.",
    presentingSymptoms: "Sharp, burning pain in the right forefoot (4/10 at rest, 8/10 after prolonged standing). Describes sensation of 'walking on a pebble' and occasional electric shocks radiating to toes.",
    vitalSigns: "BP: 126/78, HR: 72, Temp: 36.6°C, RR: 14",
    bodyPart: "foot",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "5/5 strength in all ankle and foot muscle groups. Weakness noted in intrinsic foot muscles with poor control during toe spread and lifting tests.",
      palpation: "Severe tenderness in the right 3rd intermetatarsal space with palpable 'click' during compression. Tenderness under 3rd and 4th metatarsal heads. No tenderness along plantar fascia.",
      specialTests: "Positive Mulder's sign with audible/palpable click and pain reproduction. Pain with metatarsal compression. Negative longitudinal arch compression test. Sensitivity to light touch in webspace between 3rd and 4th toes.",
      rangeOfMotion: "Normal active and passive ROM in all foot and ankle joints. Pain with metatarsophalangeal extension under loading.",
      additionalObservations: "Callus formation under 3rd and 4th metatarsal heads. Splaying of forefoot with weight-bearing. Hallux valgus deformity noted. Inappropriate footwear with narrow toe box and excessive heel height."
    },
    correctDiagnosis: "Morton's Neuroma with Secondary Metatarsalgia",
    differentialDiagnoses: [
      "Metatarsal Stress Fracture", 
      "Intermetatarsal Bursitis", 
      "Plantar Plate Injury", 
      "Rheumatoid Arthritis",
      "Tarsal Tunnel Syndrome"
    ],
    correctAssessmentApproach: [
      "Specific provocation tests (Mulder's sign, compression)",
      "Sensory assessment of affected toes and webspace",
      "Foot posture assessment in weight-bearing and non-weight-bearing",
      "Footwear assessment and gait analysis",
      "Assessment of intrinsic foot muscle strength and control",
      "Evaluation of factors contributing to forefoot overload"
    ],
    correctTreatmentApproach: "Initial management focuses on reducing compression of the affected nerve through appropriate footwear modification (wide toe box, reduced heel height). Consider temporary metatarsal pad or supportive orthoses to offload the affected intermetatarsal space. Implement intrinsic foot strengthening exercises and address any biomechanical factors contributing to forefoot overload. Manual therapy techniques including nerve mobilization may provide some relief. Education regarding appropriate footwear choices is essential for long-term management. For persistent symptoms, referral for corticosteroid injection may be considered. In recalcitrant cases unresponsive to conservative management for 3-6 months, surgical consultation may be warranted.",
    researchBasis: [
      "Matthews BG, et al. (2019). Effectiveness of non-surgical interventions for treating plantar intermetatarsal neuroma: a systematic review. Journal of Foot and Ankle Research, 12(1), 1-21.",
      "Valisena S, et al. (2018). Morton's neuroma: Clinical evaluation and treatment. Chinese Journal of Traumatology, 21(6), 356-360."
    ],
    expertSources: ["Donald Baxter", "Steven Barrett", "Howard Dananberg"]
  },
  // WRIST - Additional cases
  {
    userId: 1,
    title: "De Quervain's Tenosynovitis in New Mother",
    patientDescription: "A 32-year-old female presents with right wrist pain 2 months after giving birth to her first child.",
    history: "Pain began gradually and has progressively worsened. Reports increased pain with lifting and holding baby, particularly during feeding and changing. No prior history of wrist problems.",
    presentingSymptoms: "Sharp pain over radial aspect of wrist (6/10) with activities, particularly thumb and wrist movements. Occasional 'catching' sensation with thumb movements.",
    vitalSigns: "BP: 120/76, HR: 74, Temp: 36.7°C, RR: 14",
    bodyPart: "wrist",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 strength in thumb abduction and extension with pain during testing. 5/5 strength in all other movements. Grip strength decreased on right (18kg vs. 25kg on left).",
      palpation: "Marked tenderness over first dorsal compartment with palpable thickening. Pain with palpation along abductor pollicis longus (APL) and extensor pollicis brevis (EPB) tendons. No tenderness over scaphoid or anatomical snuffbox.",
      specialTests: "Strongly positive Finkelstein test with significant pain reproduction. Positive Eichhoff test. Negative Watson's test and TFCC loading tests.",
      rangeOfMotion: "Pain with active and passive thumb movements, particularly abduction and extension. Pain at end-range wrist ulnar deviation. Otherwise full and pain-free ROM of wrist and hand.",
      additionalObservations: "Visible swelling over first dorsal compartment. Altered mechanics when simulating baby lifting activities with compensatory wrist movements. Protective positioning of thumb during functional tasks."
    },
    correctDiagnosis: "De Quervain's Tenosynovitis",
    differentialDiagnoses: [
      "First CMC Joint Osteoarthritis", 
      "Intersection Syndrome", 
      "Scaphoid Fracture", 
      "Superficial Radial Nerve Entrapment",
      "Radial Collateral Ligament Injury"
    ],
    correctAssessmentApproach: [
      "Specific provocation tests (Finkelstein, Eichhoff)",
      "Assessment of thumb and wrist movements under load",
      "Palpation of first dorsal compartment and related structures",
      "Functional assessment of childcare activities (lifting, carrying)",
      "Assessment of scaphoid and CMC joint to rule out other pathologies",
      "Evaluation of postures and techniques during baby-care activities"
    ],
    correctTreatmentApproach: "Initial management focuses on activity modification and education about wrist and thumb positioning during childcare activities. Consider temporary immobilization with a thumb spica splint particularly for night use and during aggravating activities. Implement gentle progressive loading of the affected tendons as symptoms allow, starting with isometric exercises and progressing to isotonic and functional exercises. Manual therapy techniques including soft tissue mobilization and tendon gliding exercises may be beneficial. Demonstrate proper lifting and carrying techniques for the baby to minimize radial deviation and thumb abduction. For persistent symptoms, referral for corticosteroid injection may be considered. Education about the typical self-limiting nature of the condition is important for reducing anxiety.",
    researchBasis: [
      "Huisstede BM, et al. (2017). Multidisciplinary consensus on the terminology and classification of complaints of the arm, neck and/or shoulder. Occupational and Environmental Medicine, 64(5), 313-319.",
      "Roll SC, Evans KD. (2017). Sonographic diagnosis and treatment of de Quervain's tenosynovitis. Journal of Diagnostic Medical Sonography, 33(1), 51-57."
    ],
    expertSources: ["Elaine Bortoluzzi", "Joy MacDermid", "Susan Michlovitz"]
  },
  {
    userId: 1,
    title: "Scapholunate Ligament Injury in a Fall",
    patientDescription: "A 29-year-old male construction worker presents with right wrist pain following a fall onto an outstretched hand 3 weeks ago.",
    history: "Fell from approximately 4 feet landing on extended wrist. Initial swelling and pain, self-treated with rest and ice. Attempted to return to work after 1 week but pain persisted with loading activities. No previous wrist injuries.",
    presentingSymptoms: "Dorsal wrist pain centered over the scapholunate interval (3/10 at rest, 7/10 with loading). Reports clicking sensation and weakness with gripping activities.",
    vitalSigns: "BP: 126/74, HR: 76, Temp: 36.7°C, RR: 14",
    bodyPart: "wrist",
    complexity: "advanced",
    hiddenFindings: {
      strength: "Decreased grip strength (22kg right vs. 38kg left). Pain with resisted wrist extension. Otherwise 5/5 strength in all wrist and hand movements.",
      palpation: "Tenderness over scapholunate interval with palpable step-off. Minimal tenderness over TFCC and distal radius. No significant swelling at time of assessment.",
      specialTests: "Positive Watson's scaphoid shift test with pain and clunking. Positive scapholunate ballottement test. Mild pain with TFCC compression. Increased laxity with midcarpal clunk test compared to uninvolved side.",
      rangeOfMotion: "Full active and passive ROM with pain at end-range wrist extension and radial deviation. Subtle asymmetry in dart-thrower's motion compared to uninvolved side.",
      additionalObservations: "Mild widening of scapholunate interval visible on active wrist movement. Compensatory movement patterns during gripping and loading activities. Apprehension with high-load wrist positions."
    },
    correctDiagnosis: "Scapholunate Ligament Injury/Instability",
    differentialDiagnoses: [
      "TFCC Tear", 
      "Distal Radius Fracture", 
      "Scaphoid Fracture", 
      "Lunotriquetral Ligament Injury",
      "Dorsal Wrist Capsular Sprain"
    ],
    correctAssessmentApproach: [
      "Specific instability tests (Watson's, scapholunate ballottement)",
      "Carpal stress tests and midcarpal stability assessment",
      "Evaluation of pain with loaded wrist positions",
      "TFCC and distal radioulnar joint assessment",
      "Grip strength measurement",
      "Urgent referral for imaging (X-ray with clenched fist view, MRI)"
    ],
    correctTreatmentApproach: "Initial management with protective wrist splinting in neutral position to prevent further instability during the acute phase (6-8 weeks). Early referral for orthopedic hand specialist consultation is crucial as these injuries often require surgical intervention for optimal outcomes. If non-operative management is selected, implement progressive proprioceptive training and controlled loading exercises for wrist stabilizers. Gradual return to functional activities with appropriate wrist support. Education about the importance of avoiding high-load wrist extension activities. For partial tears with minimal instability, conservative management may be attempted, but close monitoring for progressive instability is essential. Return to heavy manual labor may be delayed 3-6 months depending on stability and surgical intervention.",
    researchBasis: [
      "Lee SK, et al. (2018). Scapholunate instability: current concepts in diagnosis and management. Journal of Hand Surgery, 43(7), 682-695.",
      "Andersson JK, Garcia-Elias M. (2016). Dorsal scapholunate ligament injury: a classification of clinical forms. Journal of Hand Surgery (European Volume), 41(7), 714-720."
    ],
    expertSources: ["Marc Garcia-Elias", "David Slutsky", "Greg Bain"]
  }
];

/**
 * Adds additional case studies to the database
 * @param storage Storage interface for database operations
 */
export async function addAdditionalCaseStudies(storage: any): Promise<void> {
  console.log("Adding additional case studies to database...");
  
  for (const caseStudy of additionalCaseStudies) {
    try {
      await storage.createAICaseStudy(caseStudy);
    } catch (error) {
      console.error(`Error adding case study "${caseStudy.title}":`, error);
    }
  }
  
  console.log(`Successfully added ${additionalCaseStudies.length} additional case studies`);
}