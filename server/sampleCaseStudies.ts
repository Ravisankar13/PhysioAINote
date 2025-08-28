import { AICaseStudy } from "./aiCaseStudyGenerator";

export const sampleCaseStudies: Omit<AICaseStudy, 'id' | 'createdAt'>[] = [
  // Shoulder cases - 6 cases covering different complexities
  {
    userId: 1,
    title: "Office Worker with Gradual Onset Shoulder Pain",
    patientDescription: "A 45-year-old office worker presents with right shoulder pain that has gradually worsened over the past 3 months.",
    history: "The patient reports no specific injury but has been working longer hours at the computer. Pain is worse when reaching overhead and when sleeping on the affected side. Has tried over-the-counter pain medication with minimal relief.",
    presentingSymptoms: "Dull ache in right shoulder that becomes sharp with certain movements, particularly overhead reaching and external rotation. Pain rated as 6/10 at worst, 3/10 at rest.",
    vitalSigns: "BP: 125/78, HR: 72, Temp: 36.8°C, RR: 16",
    bodyPart: "shoulder",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 strength in external rotation and abduction. Mild pain with resisted movements.",
      palpation: "Tenderness over the supraspinatus insertion and greater tuberosity. No significant tenderness over the AC joint or biceps tendon.",
      specialTests: "Positive Neer and Hawkins-Kennedy impingement tests. Positive empty can test. Negative Speed's test and O'Brien's test.",
      rangeOfMotion: "Active elevation limited to 150° with pain from 90-150°. External rotation limited to 65° with pain at end range. Internal rotation to L1 level.",
      additionalObservations: "Subtle scapular dyskinesis with decreased upward rotation during elevation."
    },
    correctDiagnosis: "Supraspinatus Tendinopathy with Secondary Impingement",
    differentialDiagnoses: ["Rotator Cuff Tear", "Glenohumeral Instability", "Acromioclavicular Joint Pathology", "Cervical Radiculopathy"],
    correctAssessmentApproach: [
      "Full shoulder examination including AROM, PROM, strength testing",
      "Special tests for impingement (Neer, Hawkins-Kennedy)",
      "Special tests for rotator cuff pathology (Empty can, external rotation lag)",
      "Special tests for labral pathology (O'Brien's, Speed's)",
      "Scapular dyskinesis assessment",
      "Cervical screening"
    ],
    correctTreatmentApproach: "Initial treatment focuses on reducing pain and inflammation through relative rest, activity modification, and possible short-term NSAIDs if no contraindications. Progressive rehabilitation should include scapular stabilization exercises, rotator cuff strengthening with emphasis on external rotators, and gradual progression to functional movements. Education on workstation ergonomics and posture is essential. If no improvement after 4-6 weeks of consistent rehabilitation, consider imaging and referral.",
    researchBasis: [
      "Lewis, J. (2016). Rotator cuff related shoulder pain: Assessment, management and uncertainties. Manual Therapy, 23, 57-68.",
      "Pieters, L., Lewis, J., Kuppens, K., Jochems, J., Bruijnes, T., Joossens, L., & Struyf, F. (2020). An update of systematic reviews examining the effectiveness of conservative physical therapy interventions for subacromial shoulder pain. Journal of Orthopaedic & Sports Physical Therapy, 50(3), 131-141."
    ],
    expertSources: ["Jeremy Lewis", "Jo Gibson", "Ann Cools"]
  },
  {
    userId: 1,
    title: "Young Basketball Player with Acute Shoulder Injury",
    patientDescription: "A 19-year-old male basketball player presents with acute right shoulder pain after being fouled during a game.",
    history: "Patient reports that his arm was pulled backward while attempting to catch a ball. He felt a 'pop' and immediate pain. Teammates helped 'put it back in place' on the court before seeking medical attention.",
    presentingSymptoms: "Severe pain (8/10) and apprehension with any movement, especially external rotation. Holding arm close to body for protection.",
    vitalSigns: "BP: 130/85, HR: 88, Temp: 36.6°C, RR: 18",
    bodyPart: "shoulder",
    complexity: "advanced",
    hiddenFindings: {
      strength: "Unable to test properly due to pain and apprehension. Patient resists most movements due to fear.",
      palpation: "Tenderness over anterior glenohumeral joint. No step deformity present at time of examination.",
      specialTests: "Positive apprehension test. Positive anterior drawer. Positive load and shift test. Positive sulcus sign.",
      rangeOfMotion: "Severely limited due to pain and apprehension. Unwilling to abduct beyond 45° or externally rotate beyond neutral.",
      additionalObservations: "Mild swelling around the anterior shoulder. Visible anxiety with attempted movement."
    },
    correctDiagnosis: "Anterior Glenohumeral Dislocation with Suspected Bankart Lesion",
    differentialDiagnoses: ["Rotator Cuff Tear", "Glenohumeral Subluxation", "SLAP Lesion", "Hill-Sachs Lesion"],
    correctAssessmentApproach: [
      "Limited acute assessment due to pain and apprehension",
      "Gentle stability testing as tolerated",
      "Neurovascular assessment of the affected limb",
      "Referral for immediate imaging (X-ray, possible MRI)",
      "Assessment of readiness for rehabilitation post-medical clearance"
    ],
    correctTreatmentApproach: "Immediate referral for medical evaluation and imaging. After medical clearance, initial management includes protection with limited external rotation, education on avoiding at-risk positions, and gradual introduction of isometric rotator cuff and scapular exercises. Progress to rotator cuff strengthening and proprioceptive training. For young athletes, discuss high recurrence risk and possible surgical options. Return to sports requires full strength, ROM, and sport-specific rehabilitation, typically 3-6 months depending on intervention.",
    researchBasis: [
      "Kavaja, L., Lähdeoja, T., Malmivaara, A., & Paavola, M. (2018). Treatment after traumatic shoulder dislocation: a systematic review with a network meta-analysis. British Journal of Sports Medicine, 52(23), 1498-1506.",
      "Watson, S., Allen, B., & Grant, J. A. (2016). A clinical review of return-to-play considerations after anterior shoulder dislocation. Sports Health, 8(4), 336-341."
    ],
    expertSources: ["Lars Engebretsen", "Ann Cools", "W. Ben Kibler"]
  },
  {
    userId: 1,
    title: "Middle-Aged Woman with Progressive Shoulder Stiffness",
    patientDescription: "A 52-year-old female with gradual onset of left shoulder pain and stiffness over 4 months.",
    history: "No specific injury. Symptoms began insidiously and have progressively worsened. Patient has Type 2 diabetes, well-controlled with medication. Previously very active but now limited in daily activities.",
    presentingSymptoms: "Constant aching pain (5/10) that worsens at night and with certain movements. Significant restriction in shoulder movement in all directions.",
    vitalSigns: "BP: 132/80, HR: 76, Temp: 36.7°C, RR: 16",
    bodyPart: "shoulder",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "Strength difficult to assess due to pain and restricted movement. No significant weakness when testing in available range.",
      palpation: "Diffuse tenderness around the glenohumeral joint capsule. No specific point tenderness.",
      specialTests: "Global restriction of passive range of motion with firm capsular end-feel. External rotation and abduction most severely limited.",
      rangeOfMotion: "Active and passive elevation limited to 100°. External rotation limited to 20°. Internal rotation only to greater trochanter.",
      additionalObservations: "Compensatory scapular movement evident when attempting to elevate arm."
    },
    correctDiagnosis: "Adhesive Capsulitis (Frozen Shoulder) - Freezing Phase",
    differentialDiagnoses: ["Rotator Cuff Tendinopathy", "Glenohumeral Osteoarthritis", "Calcific Tendinitis", "Acromioclavicular Arthropathy"],
    correctAssessmentApproach: [
      "Thorough shoulder examination noting both active and passive restrictions",
      "Pain pattern assessment through 24-hour cycle",
      "Detailed measurement of ROM restrictions in all planes",
      "Assessment of impact on ADLs and sleep",
      "Screening for known risk factors (diabetes, thyroid disease, etc.)"
    ],
    correctTreatmentApproach: "Education about the natural history of the condition (freezing, frozen, thawing phases). Pain management through appropriate NSAIDs if not contraindicated and activity modification. Gentle stretching within pain limits and low-load, long-duration stretches. Joint mobilizations as tolerated, progressing as symptoms allow. Maintain function of surrounding joints and muscles. Consider corticosteroid injection for severe pain in early stages. Emphasize patience with the recovery process which may take 1-3 years for full resolution.",
    researchBasis: [
      "Lewis, J. (2015). Frozen shoulder contracture syndrome–Aetiology, diagnosis and management. Manual Therapy, 20(1), 2-9.",
      "Kelley, M. J., Shaffer, M. A., Kuhn, J. E., Michener, L. A., Seitz, A. L., Uhl, T. L., & McClure, P. W. (2013). Shoulder pain and mobility deficits: adhesive capsulitis. Journal of Orthopaedic & Sports Physical Therapy, 43(5), A1-A31."
    ],
    expertSources: ["Jeremy Lewis", "Jo Gibson", "Tim Bunker"]
  },
  {
    userId: 1,
    title: "Active Gardener with Worsening Knee Pain",
    patientDescription: "A 62-year-old female with long-standing bilateral knee pain presenting with acute worsening of right knee symptoms over the past week.",
    history: "10-year history of gradually progressive knee pain, previously diagnosed with moderate OA. Acute increase in pain after gardening over the weekend. Has tried OTC NSAIDs and resting with minimal improvement.",
    presentingSymptoms: "Severe, constant aching pain (8/10) in right knee, worst with initial weight-bearing after sitting. Reports increased stiffness, warmth, and swelling compared to baseline symptoms.",
    vitalSigns: "BP: 138/85, HR: 76, Temp: 36.9°C, RR: 16",
    bodyPart: "knee",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 strength in quadriceps bilaterally (limited by pain on right). 4+/5 hamstring strength bilaterally.",
      palpation: "Moderate effusion in right knee. Tenderness along medial and lateral joint lines. Palpable osteophytes medially. Increased warmth over right knee compared to left.",
      specialTests: "Pain with patellofemoral compression. Crepitus with active motion. Painful and limited squat test.",
      rangeOfMotion: "Right knee: Active ROM 5-110° (limited by pain). Left knee: Active ROM 0-120°. Bilateral varus deformity, more prominent on right.",
      additionalObservations: "Antalgic gait with decreased stance phase on right. Uses hands for support with sit-to-stand. Bilateral quadriceps atrophy, more pronounced on right."
    },
    correctDiagnosis: "Knee Osteoarthritis with Acute Inflammatory Flare",
    differentialDiagnoses: ["Gout", "Septic Arthritis", "Meniscal Tear", "Pes Anserine Bursitis"],
    correctAssessmentApproach: [
      "Assessment of acute changes compared to baseline symptoms",
      "Detailed examination of effusion, warmth, and ROM",
      "Pain patterns and aggravating/easing factors",
      "Functional assessment (gait, stairs, transfers)",
      "Assessment of impact on daily activities",
      "Screening for red flags (fever, rapid onset, severe night pain)"
    ],
    correctTreatmentApproach: "Short-term management of the flare includes relative rest from aggravating activities, appropriate NSAIDs if not contraindicated, and local modalities (ice, compression). Education regarding activity pacing and flare management. Once the acute flare subsides, focus on progressive strengthening of quadriceps and hip muscles, low-impact aerobic exercise (walking, cycling, aquatic exercise), and weight management if applicable. Consider assistive devices (cane, knee brace) for temporary symptom management. Discuss options for referral for intra-articular corticosteroid injection if severe symptoms persist. Provide education on long-term self-management strategies including regular exercise and activity modification.",
    researchBasis: [
      "Bannuru, R. R., Osani, M. C., Vaysbrot, E. E., Arden, N. K., Bennell, K., Bierma-Zeinstra, S. M., & McAlindon, T. E. (2019). OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis. Osteoarthritis and Cartilage, 27(11), 1578-1589.",
      "Bartholdy, C., Juhl, C., Christensen, R., Lund, H., Zhang, W., & Henriksen, M. (2017). The role of muscle strengthening in exercise therapy for knee osteoarthritis: A systematic review and meta-regression analysis of randomized trials. Seminars in Arthritis and Rheumatism, 47(1), 9-21."
    ],
    expertSources: ["Kim Bennell", "Ewa Roos", "David Hunter"]
  },
  {
    userId: 1,
    title: "Carpenter with Neck Pain and Arm Symptoms",
    patientDescription: "A 48-year-old carpenter presents with right-sided neck pain radiating into the arm and thumb.",
    history: "Gradual onset over 3 weeks without specific injury. Works overhead frequently and reports increased symptoms after long workdays. Has tried over-the-counter pain medications with minimal relief.",
    presentingSymptoms: "Sharp neck pain (5/10) with shooting pain and occasional tingling into the right arm, extending to the thumb and index finger. Reports weakness when using screwdriver.",
    vitalSigns: "BP: 130/82, HR: 72, Temp: 36.6°C, RR: 16",
    bodyPart: "neck",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 weakness in right wrist extension and elbow extension. 5/5 strength in all other myotomes.",
      palpation: "Tenderness over right C6-C7 facet joint and corresponding paraspinal muscles. Tenderness along right triceps and into lateral forearm.",
      specialTests: "Positive Spurling's test to the right. Positive right Upper Limb Tension Test (median nerve bias). Cervical distraction provides relief of arm symptoms.",
      rangeOfMotion: "Cervical flexion 35° (increases arm symptoms), extension 30° (increases arm symptoms), right rotation 40° (painful and limited), left rotation 60° (pain-free), right side flexion 20° (increases arm symptoms), left side flexion 35° (decreases arm symptoms).",
      additionalObservations: "Diminished right triceps reflex (1+) compared to left (2+). Hypoesthesia along right C7 dermatome (middle finger)."
    },
    correctDiagnosis: "Cervical Radiculopathy (C7 nerve root)",
    differentialDiagnoses: ["Cervical Disc Herniation", "Thoracic Outlet Syndrome", "Peripheral Nerve Entrapment", "Cervical Spondylosis"],
    correctAssessmentApproach: [
      "Detailed neurological examination (dermatomes, myotomes, reflexes)",
      "Upper limb tension tests and cervical provocation tests",
      "Assessment of cervical ROM and painful patterns",
      "Cervical clearing tests (distraction, compression)",
      "Assessment of functional limitations in work-related activities",
      "Consideration of imaging (X-ray, MRI if severe or persistent)"
    ],
    correctTreatmentApproach: "Initial focus on pain management through gentle neural mobilization techniques, careful cervical manual therapy (avoiding aggravation of neurological symptoms), and education on positioning for symptom relief. Progress to cervical retraction exercises, nerve gliding techniques, and gradual strengthening of affected muscles. Workstation and tool modification recommendations to reduce overhead work and awkward neck positions. If symptoms persist beyond 4-6 weeks or worsen, referral for medical management and possible imaging is warranted.",
    researchBasis: [
      "Thoomes, E. J., Scholten-Peeters, W., Koes, B., Falla, D., & Verhagen, A. P. (2013). The effectiveness of conservative treatment for patients with cervical radiculopathy: a systematic review. The Clinical Journal of Pain, 29(12), 1073-1086.",
      "Cohen, S. P., & Hooten, W. M. (2017). Advances in the diagnosis and management of neck pain. BMJ, 358, j3221."
    ],
    expertSources: ["Julius Elving", "Chad Cook", "Michele Sterling"]
  },
  {
    userId: 1,
    title: "Construction Worker with Severe Back and Leg Pain",
    patientDescription: "A 41-year-old male construction worker with low back pain and right leg pain for 2 weeks.",
    history: "Pain began after lifting a heavy object at work. Initially just back pain, but leg symptoms developed 3 days later. Pain not improving despite rest and over-the-counter medication. Unable to work due to pain.",
    presentingSymptoms: "Moderate low back pain (5/10) with severe shooting pain down right posterior thigh and lateral calf to the foot (8/10). Reports pins and needles sensation in right lateral foot and difficulty walking due to pain.",
    vitalSigns: "BP: 130/82, HR: 78, Temp: 36.6°C, RR: 16",
    bodyPart: "back",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 strength in right ankle dorsiflexion and great toe extension. 5/5 strength in all other myotomes.",
      palpation: "Tenderness over right L4-L5 and L5-S1 levels. Paraspinal muscle guarding right > left.",
      specialTests: "Positive right straight leg raise at 40° with reproduction of leg symptoms. Positive slump test on right. Positive right crossed straight leg raise.",
      rangeOfMotion: "Forward flexion limited to fingertips to mid-shin with increased leg pain. Extension limited with centralization of symptoms. Right side bending limited and painful. Left side bending full with reduced symptoms.",
      additionalObservations: "Reduced sensation to light touch in right S1 dermatome (lateral foot). Diminished right ankle reflex (1+) compared to left (2+). Antalgic gait with reduced weight-bearing on right."
    },
    correctDiagnosis: "Lumbar Disc Herniation with S1 Radiculopathy",
    differentialDiagnoses: ["Piriformis Syndrome", "Facet Joint Syndrome", "Spinal Stenosis", "SI Joint Dysfunction"],
    correctAssessmentApproach: [
      "Thorough neurological examination (reflexes, sensation, myotomes)",
      "Neural tension tests (SLR, slump test)",
      "Centralization/peripheralization assessment with repeated movements",
      "Assessment of functional limitations",
      "Screening for cauda equina syndrome",
      "Consideration of imaging if severe or progressive neurological deficits"
    ],
    correctTreatmentApproach: "Initial focus on pain management through positions of comfort and movements that centralize symptoms. Directional preference exercises based on assessment findings (often extension-based for L5-S1 disc herniation). Neural mobilization techniques as tolerated. Education regarding natural history and prognosis. Activity modification to avoid symptom exacerbation while maintaining function. Graduated return to activities as symptoms improve. Referral for medical management if severe pain, progressive neurological deficits, or lack of improvement with conservative care. Expected recovery over 6-12 weeks, though complete resolution of all symptoms may take longer.",
    researchBasis: [
      "Kreiner, D. S., Hwang, S. W., Easa, J. E., Resnick, D. K., Baisden, J. L., Bess, S., & Toton, J. F. (2014). An evidence-based clinical guideline for the diagnosis and treatment of lumbar disc herniation with radiculopathy. The Spine Journal, 14(1), 180-191.",
      "Schoenfeld, A. J., & Weiner, B. K. (2010). Treatment of lumbar disc herniation: evidence-based practice. International Journal of General Medicine, 3, 209."
    ],
    expertSources: ["Stuart McGill", "Robin McKenzie", "Chad Cook"]
  },
  
  // WRIST CASE STUDIES - 10 comprehensive cases
  {
    userId: 1,
    title: "Office Worker with Wrist Pain from Repetitive Strain",
    patientDescription: "A 35-year-old software developer presents with bilateral wrist pain, worse on the right dominant hand.",
    history: "Symptoms started 3 months ago with increased workload requiring 10+ hours of daily typing. No specific injury. Pain gradually worsened despite ergonomic keyboard use.",
    presentingSymptoms: "Aching pain (6/10) along the radial aspect of both wrists, worse with typing and gripping. Occasional numbness in thumb and index finger.",
    vitalSigns: "BP: 120/75, HR: 68, Temp: 36.5°C, RR: 14",
    bodyPart: "wrist",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 grip strength bilaterally. Weakness in thumb abduction and opposition.",
      palpation: "Tenderness over first dorsal compartment and radial styloid. Positive Finkelstein test bilaterally.",
      specialTests: "Positive Finkelstein test. Negative Phalen's test. Negative Tinel's sign at carpal tunnel.",
      rangeOfMotion: "Full wrist ROM but painful at end range ulnar deviation. Thumb movement restricted and painful.",
      additionalObservations: "Mild swelling over first dorsal compartment. Crepitus with thumb movement."
    },
    correctDiagnosis: "De Quervain's Tenosynovitis",
    differentialDiagnoses: ["Carpal Tunnel Syndrome", "Intersection Syndrome", "Radial Styloid Tenosynovitis", "CMC Joint Arthritis"],
    correctAssessmentApproach: [
      "Detailed occupational history and ergonomic assessment",
      "Specific tendon palpation and provocative testing",
      "Neural screening for median and radial nerves",
      "Assessment of thumb and wrist biomechanics",
      "Evaluation of proximal contributing factors"
    ],
    correctTreatmentApproach: "Initial management with relative rest, activity modification, and splinting (thumb spica). Tendon gliding exercises and eccentric strengthening once acute pain subsides. Ergonomic assessment and modification of workstation. Neural mobilization if indicated. Progressive strengthening of wrist and thumb stabilizers. Consider corticosteroid injection if conservative management fails after 6 weeks.",
    researchBasis: [
      "Huisstede, B. M., et al. (2014). Effectiveness of surgical and postsurgical interventions for de Quervain disease. Archives of Physical Medicine and Rehabilitation, 95(7), 1358-1365.",
      "Peters-Veluthamaningal, C., et al. (2009). Corticosteroid injection for de Quervain's tenosynovitis. Cochrane Database of Systematic Reviews."
    ],
    expertSources: ["David Ring", "Amy Ladd", "Peter Amadio"]
  },
  {
    userId: 1,
    title: "Carpenter with Acute Wrist Injury After Fall",
    patientDescription: "A 42-year-old carpenter presents with severe left wrist pain after falling from a ladder onto an outstretched hand.",
    history: "Fall from 6-foot height yesterday. Immediate pain and swelling. Applied ice and compression wrap but pain persists. Unable to work today.",
    presentingSymptoms: "Severe pain (8/10) in radial aspect of wrist. Swelling and difficulty gripping tools. Pain worse with wrist extension.",
    vitalSigns: "BP: 135/82, HR: 82, Temp: 36.6°C, RR: 16",
    bodyPart: "wrist",
    complexity: "advanced",
    hiddenFindings: {
      strength: "Unable to test due to pain. Grip strength significantly reduced.",
      palpation: "Exquisite tenderness in anatomical snuffbox. Swelling over radial aspect of wrist.",
      specialTests: "Positive scaphoid compression test. Positive Watson's test. Unable to perform due to pain.",
      rangeOfMotion: "Severely limited wrist extension (20°) and radial deviation (5°) due to pain.",
      additionalObservations: "Significant swelling. No obvious deformity. Neurovascular intact distally."
    },
    correctDiagnosis: "Scaphoid Fracture",
    differentialDiagnoses: ["Distal Radius Fracture", "Scapholunate Ligament Injury", "Lunate Dislocation", "Radial Styloid Fracture"],
    correctAssessmentApproach: [
      "Immediate neurovascular assessment",
      "Careful palpation of anatomical snuffbox",
      "Scaphoid-specific provocative tests",
      "Urgent referral for imaging (X-ray, possible MRI/CT)",
      "Immobilization pending imaging results"
    ],
    correctTreatmentApproach: "Immediate immobilization in thumb spica cast/splint. Urgent referral for X-ray imaging with scaphoid views. If fracture confirmed, treatment depends on location and displacement - non-displaced waist fractures may be managed conservatively with 8-12 weeks casting, while displaced or proximal pole fractures often require surgical fixation. High risk of avascular necrosis and non-union requires close monitoring.",
    researchBasis: [
      "Dias, J. J., et al. (2020). Scaphoid fractures: Current concepts. Journal of Hand Surgery (European Volume), 45(1), 13-23.",
      "Rhemrev, S. J., et al. (2011). Current methods for diagnosis of scaphoid fractures. Journal of Hand Surgery, 36(8), 1377-1384."
    ],
    expertSources: ["Joseph Dias", "Stuart Kozin", "Marc Garcia-Elias"]
  },
  {
    userId: 1,
    title: "Pianist with Chronic Ulnar-Sided Wrist Pain",
    patientDescription: "A 28-year-old professional pianist with persistent ulnar-sided right wrist pain for 6 months.",
    history: "Gradual onset during intensive practice for competition. No specific injury. Pain worse with octaves and wide chord progressions. Has tried rest periods with temporary improvement.",
    presentingSymptoms: "Deep aching pain (5/10) on ulnar side of wrist, worse with ulnar deviation and rotation. Occasional clicking sensation.",
    vitalSigns: "BP: 118/72, HR: 64, Temp: 36.4°C, RR: 14",
    bodyPart: "wrist",
    complexity: "advanced",
    hiddenFindings: {
      strength: "5/5 grip strength but pain with resisted ulnar deviation. Normal intrinsic muscle strength.",
      palpation: "Tenderness over TFCC and ulnar styloid. Positive ulnar fovea sign.",
      specialTests: "Positive TFCC load test. Positive piano key sign. Negative ECU synergy test.",
      rangeOfMotion: "Full ROM but painful at end range pronation and ulnar deviation.",
      additionalObservations: "Subtle DRUJ instability. No swelling. Hypermobile joints generally."
    },
    correctDiagnosis: "TFCC (Triangular Fibrocartilage Complex) Injury",
    differentialDiagnoses: ["ECU Tendinopathy", "Ulnar Impaction Syndrome", "Lunotriquetral Ligament Injury", "Pisotriquetral Arthritis"],
    correctAssessmentApproach: [
      "Detailed assessment of ulnar-sided structures",
      "DRUJ stability testing",
      "TFCC provocative testing",
      "Assessment of playing technique and hand positioning",
      "Evaluation of general joint hypermobility"
    ],
    correctTreatmentApproach: "Initial conservative management with ulnar-sided wrist splint during non-playing hours. Activity modification with technique analysis to reduce ulnar loading. Progressive strengthening of ECU and FCU for dynamic stability. Proprioceptive training for wrist control. Consider MR arthrography if no improvement. May require arthroscopic debridement or repair if conservative treatment fails after 3-6 months.",
    researchBasis: [
      "Sachar, K. (2012). Ulnar-sided wrist pain: evaluation and treatment of triangular fibrocartilage complex tears. Journal of Hand Surgery, 37(7), 1489-1500.",
      "Kleinman, W. B. (2015). Stability of the distal radioulnar joint: biomechanics, pathophysiology, physical diagnosis. Journal of Hand Surgery, 40(4), 825-832."
    ],
    expertSources: ["William Kleinman", "Richard Berger", "Andrew Palmer"]
  },
  {
    userId: 1,
    title: "Pregnant Woman with Bilateral Wrist Numbness",
    patientDescription: "A 32-year-old woman in her third trimester presenting with bilateral hand numbness and tingling, worse at night.",
    history: "Symptoms started 6 weeks ago, progressively worsening. Wakes multiple times nightly with hand numbness. Shakes hands for relief. First pregnancy, currently 32 weeks.",
    presentingSymptoms: "Numbness and tingling in thumb, index, and middle fingers bilaterally. Night pain (7/10). Dropping objects frequently.",
    vitalSigns: "BP: 125/78, HR: 78, Temp: 36.5°C, RR: 16",
    bodyPart: "wrist",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 thumb abduction (APB weakness). Difficulty with fine motor tasks.",
      palpation: "Positive Tinel's sign at carpal tunnel bilaterally. Mild hand edema.",
      specialTests: "Positive Phalen's test within 30 seconds. Positive Durkan's compression test. Positive flick sign.",
      rangeOfMotion: "Full wrist ROM. No painful movements.",
      additionalObservations: "Thenar atrophy beginning on right. Bilateral hand edema. Pregnancy-related fluid retention."
    },
    correctDiagnosis: "Pregnancy-Related Carpal Tunnel Syndrome",
    differentialDiagnoses: ["Peripheral Neuropathy", "Cervical Radiculopathy", "Thoracic Outlet Syndrome", "De Quervain's Tenosynovitis"],
    correctAssessmentApproach: [
      "Detailed symptom pattern and timeline assessment",
      "Median nerve provocative testing",
      "Sensory and motor assessment of median nerve distribution",
      "Assessment of fluid retention and edema",
      "Screen for differential diagnoses"
    ],
    correctTreatmentApproach: "Conservative management with nocturnal wrist splints in neutral position. Activity modification and ergonomic adjustments. Nerve gliding exercises. Edema management through elevation and gentle massage. Consider vitamin B6 supplementation (with OB approval). Most cases resolve postpartum, but severe cases may require corticosteroid injection. Surgery rarely indicated during pregnancy.",
    researchBasis: [
      "Padua, L., et al. (2010). Carpal tunnel syndrome in pregnancy: multiperspective follow-up. Neurology, 75(15), 1373-1377.",
      "Ablove, R. H., & Ablove, T. S. (2009). Prevalence of carpal tunnel syndrome in pregnant women. Wisconsin Medical Journal, 108(4), 194-196."
    ],
    expertSources: ["Luca Padua", "Susan Mackinnon", "David Green"]
  },
  {
    userId: 1,
    title: "Gymnast with Chronic Dorsal Wrist Pain",
    patientDescription: "A 16-year-old competitive gymnast with chronic bilateral dorsal wrist pain, worse on the right.",
    history: "Pain for 8 months, gradually worsening. Trains 20+ hours weekly. Pain worst with weight-bearing activities like handstands and vaulting. Has competed through pain.",
    presentingSymptoms: "Dorsal wrist pain (6/10) with weight-bearing. Occasional swelling after training. Morning stiffness lasting 30 minutes.",
    vitalSigns: "BP: 110/65, HR: 58, Temp: 36.3°C, RR: 14",
    bodyPart: "wrist",
    complexity: "advanced",
    hiddenFindings: {
      strength: "5/5 strength throughout. Pain with resisted wrist extension.",
      palpation: "Tenderness over dorsal capsule and scapholunate interval. Mild dorsal swelling.",
      specialTests: "Positive Watson's test. Pain with weight-bearing in extension. Positive dorsal impingement test.",
      rangeOfMotion: "Limited wrist extension to 70° (compared to 85° on left). Full flexion and deviation.",
      additionalObservations: "Dorsal ganglion cyst palpable. Evidence of dorsal capsulitis. Wrist hypermobility."
    },
    correctDiagnosis: "Gymnast's Wrist (Dorsal Impingement Syndrome)",
    differentialDiagnoses: ["Scapholunate Ligament Injury", "Dorsal Ganglion Cyst", "Stress Fracture", "Kienbock's Disease"],
    correctAssessmentApproach: [
      "Sport-specific movement assessment",
      "Weight-bearing tolerance testing",
      "Assessment of training load and technique",
      "Evaluation of wrist mobility and stability",
      "Consider imaging for stress reactions"
    ],
    correctTreatmentApproach: "Initial relative rest with training modification to reduce weight-bearing loads. Dorsal blocking splint or taping during activities. Progressive strengthening of wrist stabilizers and proprioception training. Technique modification to reduce hyperextension loading. Gradual return to weight-bearing with 'tiger paw' positioning. May require extended rest period (3-6 months) if stress reaction present. Long-term load management essential.",
    researchBasis: [
      "Webb, B. G., & Rettig, L. A. (2008). Gymnastic wrist injuries. Current Sports Medicine Reports, 7(5), 289-295.",
      "Wolf, M. R., et al. (2017). Impact loading of the gymnast's wrist. Journal of Hand Surgery, 42(10), 817-823."
    ],
    expertSources: ["Michelle Carlson", "Lori Algar", "Ellen Casey"]
  },
  {
    userId: 1,
    title: "Elderly Patient with Wrist Fracture from Fall",
    patientDescription: "A 72-year-old woman with right wrist pain and deformity after falling on ice.",
    history: "Slipped on ice this morning, landing on outstretched right hand. Immediate pain and visible deformity. Has osteoporosis, on calcium and vitamin D.",
    presentingSymptoms: "Severe pain (9/10) in right wrist. Visible deformity. Unable to move wrist. Swelling increasing.",
    vitalSigns: "BP: 145/85, HR: 92, Temp: 36.4°C, RR: 18",
    bodyPart: "wrist",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "Unable to assess due to pain and deformity.",
      palpation: "Obvious dinner fork deformity. Tenderness throughout distal radius.",
      specialTests: "Neurovascular intact distally. No signs of median nerve compression.",
      rangeOfMotion: "No active movement due to pain and instability.",
      additionalObservations: "Significant swelling. Dinner fork deformity consistent with Colles fracture."
    },
    correctDiagnosis: "Colles Fracture (Distal Radius Fracture)",
    differentialDiagnoses: ["Smith's Fracture", "Barton's Fracture", "Radiocarpal Dislocation", "Both Bone Forearm Fracture"],
    correctAssessmentApproach: [
      "Immediate neurovascular assessment",
      "Assessment of skin integrity",
      "Evaluation of deformity and instability",
      "Urgent referral for X-ray imaging",
      "Assessment of functional status and living situation"
    ],
    correctTreatmentApproach: "Immediate immobilization and elevation. Ice for pain and swelling control. Urgent orthopedic referral for reduction and casting/surgical fixation depending on fracture pattern and stability. Post-reduction management includes edema control, early finger movement, and monitoring for complications. Rehabilitation focuses on regaining function for ADLs, typically requiring 8-12 weeks for healing with additional time for functional recovery.",
    researchBasis: [
      "Nellans, K. W., et al. (2012). The epidemiology of distal radius fractures. Hand Clinics, 28(2), 113-125.",
      "Lichtman, D. M., et al. (2010). Treatment of distal radius fractures. Journal of the American Academy of Orthopaedic Surgeons, 18(3), 180-189."
    ],
    expertSources: ["Jesse Jupiter", "Diego Fernandez", "David Ruch"]
  },
  {
    userId: 1,
    title: "Boxer with Ulnar Nerve Compression at Wrist",
    patientDescription: "A 24-year-old amateur boxer with numbness in the ring and little fingers after intense training.",
    history: "Symptoms started 2 months ago after increasing training intensity. Numbness and tingling in ulnar digits, worse after punching heavy bag. Uses hand wraps but old gloves.",
    presentingSymptoms: "Numbness in ring and little fingers (constant). Weakness in grip. Pain along ulnar border of hand (4/10).",
    vitalSigns: "BP: 122/76, HR: 62, Temp: 36.5°C, RR: 14",
    bodyPart: "wrist",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 grip strength. Weakness in finger abduction (dorsal interossei). Weak pinch grip.",
      palpation: "Tenderness over Guyon's canal. No masses palpable.",
      specialTests: "Positive Tinel's sign at Guyon's canal. Negative at cubital tunnel. Froment's sign positive.",
      rangeOfMotion: "Full wrist ROM. No provocative positions.",
      additionalObservations: "Early interosseous atrophy. Clawing of ring and little fingers beginning."
    },
    correctDiagnosis: "Guyon's Canal Syndrome (Ulnar Tunnel Syndrome)",
    differentialDiagnoses: ["Cubital Tunnel Syndrome", "C8 Radiculopathy", "Thoracic Outlet Syndrome", "Hypothenar Hammer Syndrome"],
    correctAssessmentApproach: [
      "Detailed ulnar nerve assessment along entire course",
      "Specific testing at Guyon's canal",
      "Assessment of training equipment and technique",
      "Evaluation of intrinsic muscle function",
      "Sensory testing in ulnar distribution"
    ],
    correctTreatmentApproach: "Activity modification with proper padding and new gloves. Avoid direct pressure over hypothenar eminence. Nerve gliding exercises for ulnar nerve. Strengthen intrinsic muscles. Anti-inflammatory treatment if acute inflammation present. Consider ergonomic assessment of punching technique. If no improvement in 6-8 weeks, consider EMG/NCS and possible surgical decompression.",
    researchBasis: [
      "Aleksenko, D., & Varacallo, M. (2021). Guyon canal syndrome. StatPearls Publishing.",
      "Capitani, D., & Beer, S. (2002). Handlebar palsy–a compression syndrome of the deep terminal motor branch of the ulnar nerve. Journal of Neurology, 249(12), 1694-1696."
    ],
    expertSources: ["Susan Mackinnon", "Robert Szabo", "Scott Wolfe"]
  },
  {
    userId: 1,
    title: "Hairdresser with Bilateral Wrist Tendinitis",
    patientDescription: "A 38-year-old hairdresser with bilateral wrist pain from repetitive scissor use and blow-drying.",
    history: "Progressive pain over 4 months. Works 50+ hours weekly. Pain worse at end of day and with sustained gripping. Previous episodes resolved with rest.",
    presentingSymptoms: "Aching pain (5/10) along dorsal wrists bilaterally. Morning stiffness. Occasional swelling after busy days.",
    vitalSigns: "BP: 124/78, HR: 70, Temp: 36.6°C, RR: 15",
    bodyPart: "wrist",
    complexity: "beginner",
    hiddenFindings: {
      strength: "4+/5 wrist extension. Pain with resisted extension and radial deviation.",
      palpation: "Tenderness over extensor tendon compartments 1 and 2. Mild crepitus.",
      specialTests: "Pain with resisted wrist extension. Positive Cozen's test variant for wrist.",
      rangeOfMotion: "Full ROM but painful at end ranges. Stiffness after prolonged positioning.",
      additionalObservations: "Bilateral symptoms worse on dominant right. Thickening of extensor tendons."
    },
    correctDiagnosis: "Extensor Tendinopathy (Intersection Syndrome)",
    differentialDiagnoses: ["De Quervain's Tenosynovitis", "Extensor Pollicis Longus Tendinitis", "Dorsal Wrist Impingement", "Radiocarpal Arthritis"],
    correctAssessmentApproach: [
      "Occupational movement analysis",
      "Assessment of tool ergonomics",
      "Specific tendon palpation and loading tests",
      "Evaluation of wrist positioning during work tasks",
      "Assessment of proximal contributions (shoulder/elbow)"
    ],
    correctTreatmentApproach: "Relative rest with activity modification. Ergonomic tool selection (lighter scissors, balanced dryer). Tendon gliding exercises and eccentric strengthening program. Ice after work. Consider wrist supports during work. Progressive loading program. Technique modification to reduce sustained positions. May benefit from corticosteroid injection if severe inflammation present.",
    researchBasis: [
      "Rettig, A. C. (2001). Wrist and hand overuse syndromes. Clinics in Sports Medicine, 20(3), 591-611.",
      "Descatha, A., et al. (2003). Prevalence of tendinitis at the wrist in hairdressers. Occupational Medicine, 53(5), 351-354."
    ],
    expertSources: ["Alexis Descatha", "Richard Gelberman", "Nancy Major"]
  },
  {
    userId: 1,
    title: "Rock Climber with Wrist Ganglion Cyst",
    patientDescription: "A 29-year-old rock climber with a painful dorsal wrist swelling that appeared 3 months ago.",
    history: "Noticed swelling after intensive climbing session. Size varies but never completely resolves. Pain with wrist extension and climbing. No previous wrist injuries.",
    presentingSymptoms: "Visible dorsal wrist swelling (2cm). Pain with pressure and extreme wrist positions (4/10). Limits climbing performance.",
    vitalSigns: "BP: 118/70, HR: 60, Temp: 36.4°C, RR: 14",
    bodyPart: "wrist",
    complexity: "beginner",
    hiddenFindings: {
      strength: "5/5 strength throughout. No weakness but apprehension with loaded extension.",
      palpation: "Firm, mobile mass over dorsal wrist. Transilluminates. Non-tender unless compressed.",
      specialTests: "Mass moves with wrist flexion. Positive transillumination test.",
      rangeOfMotion: "Full ROM but slight limitation in extension due to mass effect.",
      additionalObservations: "Classic dorsal wrist ganglion arising from scapholunate interval."
    },
    correctDiagnosis: "Dorsal Wrist Ganglion Cyst",
    differentialDiagnoses: ["Synovitis", "Extensor Tenosynovitis", "Occult Scaphoid Fracture", "Kienbock's Disease"],
    correctAssessmentApproach: [
      "Assessment of mass characteristics",
      "Transillumination testing",
      "Evaluation of functional limitations",
      "Assessment of underlying joint stability",
      "Impact on climbing-specific movements"
    ],
    correctTreatmentApproach: "Conservative management initially - observation if asymptomatic. Activity modification to avoid provocative positions. Compression or protective padding during climbing. Consider aspiration for temporary relief (high recurrence rate). Surgical excision if significantly limiting function or failed conservative management. 10-20% recurrence rate post-surgery. Return to climbing typically 6-8 weeks post-surgery.",
    researchBasis: [
      "Head, L., et al. (2015). Wrist ganglion treatment: systematic review and meta-analysis. Journal of Hand Surgery, 40(3), 546-553.",
      "Gude, W., & Morelli, V. (2008). Ganglion cysts of the wrist: pathophysiology, diagnosis, and management. Current Reviews in Musculoskeletal Medicine, 1(3), 205-211."
    ],
    expertSources: ["William Gude", "Kevin Chung", "Matthew Tomaino"]
  },
  {
    userId: 1,
    title: "Violinist with Radial Tunnel Syndrome",
    patientDescription: "A 45-year-old professional violinist with lateral forearm and wrist pain affecting performance.",
    history: "Gradual onset over 6 months. Pain with prolonged playing, especially difficult passages requiring finger dexterity. Previous diagnosis of 'tennis elbow' with no improvement from treatment.",
    presentingSymptoms: "Deep aching pain in proximal forearm extending to wrist (5/10). Fatigue with playing. No numbness or tingling.",
    vitalSigns: "BP: 126/80, HR: 68, Temp: 36.5°C, RR: 15",
    bodyPart: "wrist",
    complexity: "advanced",
    hiddenFindings: {
      strength: "5/5 strength but fatigue with repetitive finger extension. Pain with resisted supination.",
      palpation: "Tenderness 5cm distal to lateral epicondyle over supinator. No lateral epicondyle tenderness.",
      specialTests: "Positive supinator compression test. Negative Cozen's test. Pain with resisted middle finger extension.",
      rangeOfMotion: "Full elbow and wrist ROM. Pain with passive pronation with wrist flexion.",
      additionalObservations: "Symptoms reproduced with playing position. No true weakness, mainly fatigue."
    },
    correctDiagnosis: "Radial Tunnel Syndrome (Posterior Interosseous Nerve Syndrome)",
    differentialDiagnoses: ["Lateral Epicondylitis", "PIN Compression", "C6 Radiculopathy", "Extensor Tendinopathy"],
    correctAssessmentApproach: [
      "Rule out lateral epicondylitis",
      "Specific nerve compression testing",
      "Assessment of playing posture and technique",
      "Evaluation of instrument setup",
      "Neural tension testing"
    ],
    correctTreatmentApproach: "Activity modification with reduced playing time initially. Neural mobilization techniques for radial nerve. Address any contributing cervical or thoracic outlet issues. Strengthen supinator and wrist extensors eccentrically. Ergonomic assessment of violin position and chin rest. Consider night splinting in supination. If no improvement after 3 months conservative care, consider surgical decompression.",
    researchBasis: [
      "Dang, A. C., & Rodner, C. M. (2009). Unusual compression neuropathies of the forearm. Journal of Hand Surgery, 34(10), 1906-1914.",
      "Roles, N. C., & Maudsley, R. H. (1972). Radial tunnel syndrome: resistant tennis elbow as nerve entrapment. Journal of Bone and Joint Surgery, 54(3), 499-508."
    ],
    expertSources: ["Christine Novak", "Robert Spinner", "Steven Steinmann"]
  },
  
  // HAND CASE STUDIES - 10 comprehensive cases
  {
    userId: 1,
    title: "Construction Worker with Mallet Finger Injury",
    patientDescription: "A 45-year-old construction worker unable to straighten the tip of his right middle finger after a work injury.",
    history: "Struck fingertip with hammer 3 days ago. Immediate pain and inability to straighten fingertip. Has been buddy taping but no improvement. Needs to return to work.",
    presentingSymptoms: "Unable to actively extend DIP joint. Fingertip droops at 40°. Pain (4/10) and swelling at DIP joint.",
    vitalSigns: "BP: 132/84, HR: 74, Temp: 36.5°C, RR: 16",
    bodyPart: "hand",
    complexity: "beginner",
    hiddenFindings: {
      strength: "0/5 active DIP extension. Normal PIP and MCP function. Good grip strength.",
      palpation: "Tender over dorsal DIP joint. Swelling present. No volar tenderness.",
      specialTests: "Complete lag at DIP joint. Passive extension full. No volar plate involvement.",
      rangeOfMotion: "DIP: 40° flexion deformity, passive extension to 0°. PIP and MCP joints normal.",
      additionalObservations: "Typical mallet deformity. Skin intact. No signs of fracture."
    },
    correctDiagnosis: "Mallet Finger (Terminal Extensor Tendon Rupture)",
    differentialDiagnoses: ["Mallet Fracture", "DIP Joint Dislocation", "Flexor Tendon Avulsion", "DIP Arthritis"],
    correctAssessmentApproach: [
      "Assessment of active vs passive DIP extension",
      "Evaluation for bony vs soft tissue injury",
      "X-ray to rule out avulsion fracture",
      "Assessment of time since injury",
      "Skin integrity evaluation"
    ],
    correctTreatmentApproach: "Continuous DIP extension splinting for 6-8 weeks (24/7). Stack splint or custom thermoplastic splint maintaining DIP in slight hyperextension. Education on splint care and not allowing DIP to drop during cleaning. After 6-8 weeks, night splinting for additional 4 weeks with gradual return to activities. Surgery rarely needed unless large bone fragment or failed conservative treatment.",
    researchBasis: [
      "Handoll, H. H., & Vaghela, M. V. (2004). Interventions for treating mallet finger injuries. Cochrane Database of Systematic Reviews.",
      "Alla, S. R., et al. (2014). Current concepts: mallet finger. Hand, 9(2), 138-144."
    ],
    expertSources: ["David Schnur", "Steven Maschke", "Peter Evans"]
  },
  {
    userId: 1,
    title: "Seamstress with Trigger Finger",
    patientDescription: "A 58-year-old seamstress with catching and locking of her right ring finger.",
    history: "Progressive catching sensation over 3 months. Now finger locks in flexion requiring other hand to straighten. Worse in mornings. Long history of hand-intensive work.",
    presentingSymptoms: "Finger catches and locks with flexion. Pain at base of finger (5/10). Morning stiffness requiring massage to 'unlock'.",
    vitalSigns: "BP: 128/76, HR: 68, Temp: 36.4°C, RR: 15",
    bodyPart: "hand",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "5/5 strength when not locked. Pain with resisted flexion.",
      palpation: "Palpable nodule at A1 pulley. Tenderness over flexor tendon sheath. Crepitus with movement.",
      specialTests: "Positive triggering with active flexion/extension. Palpable click at A1 pulley.",
      rangeOfMotion: "Full passive ROM. Active ROM limited by triggering. Compensatory DIP hyperextension.",
      additionalObservations: "Grade 3 trigger finger (actively correctable). Mild flexor tendon sheath swelling."
    },
    correctDiagnosis: "Trigger Finger (Stenosing Tenosynovitis)",
    differentialDiagnoses: ["Dupuytren's Contracture", "Flexor Tendon Nodule", "MCP Joint Arthritis", "Extensor Tendon Subluxation"],
    correctAssessmentApproach: [
      "Grading of triggering severity",
      "Palpation for nodule and A1 pulley thickening",
      "Assessment of contributing activities",
      "Evaluation for multiple digit involvement",
      "Check for associated conditions (diabetes, RA)"
    ],
    correctTreatmentApproach: "Initial conservative management with activity modification and night extension splinting. Tendon gliding exercises and gentle stretching. NSAIDs if not contraindicated. Corticosteroid injection at A1 pulley (50-70% success rate). If two injections fail or locked finger, surgical A1 pulley release indicated. Post-surgical therapy for scar management and return to function.",
    researchBasis: [
      "Makkouk, A. H., et al. (2008). Trigger finger: etiology, evaluation, and treatment. Current Reviews in Musculoskeletal Medicine, 1(2), 92-96.",
      "Ryzewicz, M., & Wolf, J. M. (2006). Trigger digits: principles, management, and complications. Journal of Hand Surgery, 31(1), 135-146."
    ],
    expertSources: ["Jennifer Wolf", "Donald Lalonde", "Keith Segalman"]
  },
  {
    userId: 1,
    title: "Teenager with Gamekeeper's Thumb from Skiing",
    patientDescription: "A 17-year-old skier with thumb pain and instability after falling with pole in hand.",
    history: "Fell while skiing yesterday, thumb caught in pole strap and forced into abduction. Immediate pain and swelling. Unable to grip properly.",
    presentingSymptoms: "Pain at base of thumb (7/10). Swelling over MCP joint. Difficulty with pinch grip. Feels unstable.",
    vitalSigns: "BP: 118/70, HR: 66, Temp: 36.5°C, RR: 14",
    bodyPart: "hand",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "Weak pinch grip (2/5). Unable to resist thumb abduction.",
      palpation: "Tenderness over ulnar aspect of thumb MCP. Significant swelling. No Stener lesion palpable.",
      specialTests: "Positive valgus stress test at 30° flexion (>30° laxity). No firm endpoint. Negative x-ray for fracture.",
      rangeOfMotion: "Limited thumb MCP flexion to 45° due to pain. IP joint normal.",
      additionalObservations: "Significant instability suggesting complete UCL rupture. Ecchymosis developing."
    },
    correctDiagnosis: "Complete UCL Rupture (Skier's/Gamekeeper's Thumb)",
    differentialDiagnoses: ["Partial UCL Tear", "Thumb MCP Dislocation", "Bennett's Fracture", "Volar Plate Injury"],
    correctAssessmentApproach: [
      "Valgus stress testing at 0° and 30° flexion",
      "Assessment for Stener lesion",
      "X-ray to rule out avulsion fracture",
      "Comparison with uninjured side",
      "Functional grip and pinch assessment"
    ],
    correctTreatmentApproach: "Complete rupture with >30° laxity or no endpoint requires surgical repair, especially if Stener lesion present. Surgery within 2-3 weeks for optimal outcomes. Post-surgical immobilization in thumb spica for 4-6 weeks, then protected motion. Gradual strengthening from 6 weeks. Return to sports at 3-4 months with protective taping/bracing. Partial tears (<30° laxity, firm endpoint) managed with thumb spica immobilization.",
    researchBasis: [
      "Samora, J. B., et al. (2013). Outcomes after injury to the thumb ulnar collateral ligament. Journal of Hand Surgery, 38(11), 2188-2197.",
      "Avery, D. M., et al. (2015). Gamekeeper's thumb: evaluation via stress radiography and treatment options. Orthopedics, 38(12), 982-987."
    ],
    expertSources: ["Julie Adams", "Robert Hotchkiss", "Scott Kozin"]
  },
  {
    userId: 1,
    title: "Arthritis Patient with Boutonniere Deformity",
    patientDescription: "A 65-year-old woman with rheumatoid arthritis presenting with progressive finger deformity.",
    history: "RA diagnosed 15 years ago, on methotrexate. Right index finger deformity developing over 6 months. No acute injury. Difficulty with fine motor tasks.",
    presentingSymptoms: "Index finger stuck in bent position at PIP. Cannot straighten middle joint. Fingertip hyperextended. Minimal pain.",
    vitalSigns: "BP: 135/82, HR: 72, Temp: 36.6°C, RR: 16",
    bodyPart: "hand",
    complexity: "advanced",
    hiddenFindings: {
      strength: "Weak PIP extension (1/5). Compensatory DIP hyperextension. Other digits show early swan neck changes.",
      palpation: "Boggy swelling at PIP joint. Tender over central slip insertion. Multiple rheumatoid nodules.",
      specialTests: "Positive Elson test. Fixed PIP flexion contracture of 40°. DIP hyperextension of 20°.",
      rangeOfMotion: "PIP: Fixed at 40° flexion. DIP: Hyperextended 20°. MCP: Full ROM.",
      additionalObservations: "Classic boutonniere deformity. Multiple joints affected by RA. Ulnar deviation at MCPs."
    },
    correctDiagnosis: "Boutonniere Deformity (Central Slip Rupture)",
    differentialDiagnoses: ["PIP Joint Contracture", "Swan Neck Deformity", "Mallet Finger", "PIP Arthritis"],
    correctAssessmentApproach: [
      "Elson test for central slip integrity",
      "Assessment of deformity flexibility vs fixed",
      "Evaluation of other digits for RA changes",
      "Functional impact assessment",
      "X-ray to evaluate joint damage"
    ],
    correctTreatmentApproach: "Early flexible deformity: Serial static PIP extension splinting with DIP free to flex. Exercises to maintain DIP flexion while extending PIP. Fixed deformity: Serial casting or dynamic splinting to improve PIP extension before strengthening. Consider surgical reconstruction if functional limitations and failed conservative care. Address underlying RA with rheumatology. Joint protection education.",
    researchBasis: [
      "Coons, M. S., & Green, S. M. (1995). Boutonniere deformity. Hand Clinics, 11(3), 387-402.",
      "Townley, W. A., et al. (2004). Management of the boutonniere deformity. Journal of Hand Surgery, 29(6), 606-613."
    ],
    expertSources: ["Scott Wolfe", "Robert Hotchkiss", "Kevin Chung"]
  },
  {
    userId: 1,
    title: "Chef with Burns and Finger Contractures",
    patientDescription: "A 34-year-old chef with finger stiffness following grease burn to dorsal hand 3 months ago.",
    history: "Deep partial thickness burn from hot oil splash. Treated conservatively with dressings. Healed but fingers increasingly stiff. Affecting work performance.",
    presentingSymptoms: "Unable to fully flex fingers into fist. Tight sensation over dorsal hand. Difficulty gripping kitchen tools.",
    vitalSigns: "BP: 124/76, HR: 70, Temp: 36.5°C, RR: 15",
    bodyPart: "hand",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "4/5 grip strength limited by ROM. Normal intrinsic muscle function.",
      palpation: "Thick, adherent scar over dorsal hand. Decreased skin mobility. No active inflammation.",
      specialTests: "Limited composite flexion - fingertips 3cm from palm. Tight intrinsic position.",
      rangeOfMotion: "MCP flexion limited to 60°. PIP flexion 70°. DIP flexion preserved.",
      additionalObservations: "Hypertrophic scarring. Dorsal hand contracture limiting MCP flexion."
    },
    correctDiagnosis: "Post-Burn Dorsal Hand Contracture",
    differentialDiagnoses: ["Dupuytren's Contracture", "Complex Regional Pain Syndrome", "Extensor Tendon Adhesions", "Joint Contractures"],
    correctAssessmentApproach: [
      "Scar assessment (Vancouver Scar Scale)",
      "ROM measurements for all joints",
      "Functional grip assessment",
      "Skin mobility and pliability testing",
      "Evaluation of scar maturity"
    ],
    correctTreatmentApproach: "Aggressive scar management with massage, silicone sheets, and compression garments. Progressive stretching program with sustained low-load prolonged stretch. Dynamic flexion splinting or serial static progressive splinting. Consider intrinsic stretching positions. May benefit from scar injection or laser therapy. Surgical release if conservative management fails and scar is mature (>6-12 months). Early intervention crucial for optimal outcomes.",
    researchBasis: [
      "Richard, R., et al. (2009). Burn hand rehabilitation. Journal of Burn Care & Research, 30(4), 543-573.",
      "Dewey, W. S., et al. (2011). Management of hand burns. Journal of Hand Surgery, 36(9), 1475-1484."
    ],
    expertSources: ["Reg Richard", "David Greenhalgh", "William Dewey"]
  },
  {
    userId: 1,
    title: "Diabetic Patient with Dupuytren's Contracture",
    patientDescription: "A 62-year-old man with diabetes presenting with progressive inability to straighten ring and little fingers.",
    history: "Noticed nodules in palm 2 years ago. Progressive flexion contracture over past year. Family history of similar condition. Type 2 diabetes for 10 years.",
    presentingSymptoms: "Cannot lay hand flat on table. Ring and little fingers contracted. Difficulty washing face and putting hand in pocket.",
    vitalSigns: "BP: 138/85, HR: 76, Temp: 36.4°C, RR: 16",
    bodyPart: "hand",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "5/5 strength in available ROM. No neurological deficits.",
      palpation: "Palpable cords from palm to ring and little fingers. Nodules in distal palmar crease. Skin pits present.",
      specialTests: "Positive tabletop test. MCP contracture 30°, PIP contracture 45° ring finger.",
      rangeOfMotion: "Ring: MCP lacks 30° extension, PIP lacks 45°. Little: MCP lacks 20° extension.",
      additionalObservations: "Well-defined pretendinous cords. Early involvement of thumb and index. Bilateral disease."
    },
    correctDiagnosis: "Dupuytren's Disease with Flexion Contractures",
    differentialDiagnoses: ["Trigger Finger", "Camptodactyly", "Post-Traumatic Contracture", "Diabetic Cheiroarthropathy"],
    correctAssessmentApproach: [
      "Tabletop test for functional impact",
      "Measurement of contracture degrees",
      "Assessment of cord vs joint contracture",
      "Evaluation of skin involvement",
      "Functional limitation assessment"
    ],
    correctTreatmentApproach: "Conservative: Observation if minimal functional impact. Consider for intervention with MCP >30° or PIP contracture. Options include: Needle aponeurotomy (percutaneous release) for simple cords. Collagenase injection for specific cords. Surgical fasciectomy for complex/recurrent disease. Post-procedure: Extension splinting, scar management, and ROM exercises. High recurrence rate (20-60%). Address diabetes control.",
    researchBasis: [
      "Hurst, L. C., et al. (2009). Injectable collagenase for Dupuytren's contracture. New England Journal of Medicine, 361(10), 968-979.",
      "Dias, J. J., & Singh, H. (2013). Dupuytren's contracture: European perspective. Hand Clinics, 29(4), 501-514."
    ],
    expertSources: ["Lawrence Hurst", "Joseph Dias", "Gary Pess"]
  },
  {
    userId: 1,
    title: "Factory Worker with Flexor Tendon Laceration",
    patientDescription: "A 38-year-old factory worker unable to bend index finger after cutting hand on sheet metal.",
    history: "Laceration to volar aspect of index finger at work today. Bleeding controlled with pressure. Unable to flex finger. Tetanus up to date.",
    presentingSymptoms: "2cm laceration volar index finger at proximal phalanx. Unable to flex DIP or PIP joints. Minimal pain (3/10).",
    vitalSigns: "BP: 128/80, HR: 78, Temp: 36.5°C, RR: 16",
    bodyPart: "hand",
    complexity: "advanced",
    hiddenFindings: {
      strength: "0/5 DIP flexion. 0/5 PIP flexion with DIP blocked. MCP flexion intact.",
      palpation: "Laceration over A2 pulley region. No active bleeding. Sensation intact.",
      specialTests: "Absent tenodesis effect. No flexor tendon function distal to injury. Intact FDS to other digits.",
      rangeOfMotion: "Passive ROM full. No active DIP or PIP flexion.",
      additionalObservations: "Zone 2 flexor tendon injury. Both FDP and FDS likely lacerated."
    },
    correctDiagnosis: "Complete Flexor Tendon Laceration (Zone 2)",
    differentialDiagnoses: ["Partial Flexor Tendon Laceration", "Nerve Injury", "Flexor Sheath Infection", "Fracture"],
    correctAssessmentApproach: [
      "Individual tendon testing (FDS and FDP)",
      "Neurovascular assessment",
      "Assessment of injury zone",
      "Evaluation of skin and soft tissue damage",
      "Tetanus status confirmation"
    ],
    correctTreatmentApproach: "Urgent referral to hand surgeon for primary repair within 24 hours ideal. Clean and dress wound, splint in protective position (wrist and fingers slightly flexed). Prophylactic antibiotics. Surgical repair of both tendons with preservation of pulley system. Post-surgical: Early protected motion protocol (Kleinert or Duran) to prevent adhesions while protecting repair. Rehabilitation crucial for optimal outcome - 3-4 months for full recovery.",
    researchBasis: [
      "Tang, J. B. (2013). Flexor tendon injuries. Clinics in Plastic Surgery, 40(3), 415-426.",
      "Strickland, J. W. (2000). Development of flexor tendon surgery: twenty-five years of progress. Journal of Hand Surgery, 25(2), 214-235."
    ],
    expertSources: ["Jin Bo Tang", "James Strickland", "Martin Boyer"]
  },
  {
    userId: 1,
    title: "Guitarist with Mucous Cyst Affecting Nail",
    patientDescription: "A 55-year-old guitarist with painful swelling near fingernail causing nail deformity.",
    history: "Swelling near index finger nail bed for 6 months. Recently started draining clear fluid. Nail now has groove. Affects guitar playing.",
    presentingSymptoms: "Cystic swelling at DIP joint (5mm). Nail deformity with longitudinal groove. Occasional drainage of clear viscous fluid.",
    vitalSigns: "BP: 125/78, HR: 66, Temp: 36.4°C, RR: 15",
    bodyPart: "hand",
    complexity: "beginner",
    hiddenFindings: {
      strength: "5/5 strength throughout. No functional deficits.",
      palpation: "Firm cystic mass between nail fold and DIP joint. Compressible. Slight DIP joint enlargement.",
      specialTests: "Transilluminates positively. Pressure causes slight expression of fluid. X-ray shows DIP osteoarthritis.",
      rangeOfMotion: "DIP flexion limited to 45° (60° contralateral). Mild crepitus.",
      additionalObservations: "Nail groove from pressure on germinal matrix. Early Heberden's nodes."
    },
    correctDiagnosis: "Digital Mucous Cyst (Myxoid Cyst)",
    differentialDiagnoses: ["Paronychia", "Glomus Tumor", "Ganglion Cyst", "Epidermoid Inclusion Cyst"],
    correctAssessmentApproach: [
      "Assessment of cyst characteristics",
      "Evaluation of nail deformity",
      "DIP joint assessment for arthritis",
      "Transillumination test",
      "X-ray to evaluate underlying arthritis"
    ],
    correctTreatmentApproach: "Conservative: Observation if asymptomatic. Avoid repeated aspiration (high recurrence, infection risk). Surgical excision if symptomatic, recurrent drainage, or progressive nail deformity. Surgery includes cyst excision, joint debridement of osteophytes, and possible skin coverage. Nail deformity may persist even after successful treatment. 10-15% recurrence rate after surgery.",
    researchBasis: [
      "Dodge, L. D., et al. (1998). Digital mucous cyst. Hand Clinics, 14(3), 433-442.",
      "Rizzo, M., et al. (2003). Treatment of mucous cysts of the fingers. Journal of Hand Surgery, 28(6), 1089-1094."
    ],
    expertSources: ["Marco Rizzo", "Charles Goldfarb", "Douglas Sammer"]
  },
  {
    userId: 1,
    title: "Baseball Player with Jersey Finger",
    patientDescription: "A 22-year-old baseball player unable to bend fingertip after grabbing opponent's jersey.",
    history: "Injury during game 2 days ago when finger caught in jersey during tag. Felt pop and immediate inability to bend fingertip. Swelling at fingertip.",
    presentingSymptoms: "Unable to actively flex DIP joint of ring finger. Swelling and tenderness at volar fingertip. Bruising developing.",
    vitalSigns: "BP: 120/72, HR: 64, Temp: 36.5°C, RR: 14",
    bodyPart: "hand",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "0/5 DIP flexion. Normal FDS function (PIP flexion with other fingers blocked).",
      palpation: "Tender at FDP insertion. Palpable tendon mass in palm. Swelling at DIP joint.",
      specialTests: "Absent DIP flexion with PIP blocked. Positive tendon retraction into palm.",
      rangeOfMotion: "Passive DIP flexion full. No active DIP flexion. PIP and MCP normal.",
      additionalObservations: "FDP avulsion from insertion. Tendon retracted to palm level (Type III)."
    },
    correctDiagnosis: "Jersey Finger (FDP Avulsion)",
    differentialDiagnoses: ["Mallet Finger", "DIP Joint Dislocation", "Fracture", "Trigger Finger"],
    correctAssessmentApproach: [
      "Isolated FDP testing",
      "Palpation for tendon retraction level",
      "X-ray for bony avulsion",
      "Leddy and Packer classification",
      "Timing since injury assessment"
    ],
    correctTreatmentApproach: "Surgical repair required, urgency depends on retraction level. Type I (retracted to palm): Surgery within 7-10 days before tendon contracts. Type II (PIP level): Surgery within 3 weeks. Type III (with bone fragment): Less urgent but within 6 weeks. Post-surgical: Protected motion protocol to prevent adhesions while protecting repair. Return to sports typically 3-4 months.",
    researchBasis: [
      "Leddy, J. P., & Packer, J. W. (1977). Avulsion of the profundus tendon insertion. Journal of Hand Surgery, 2(1), 66-69.",
      "Tuttle, H. G., et al. (2014). Jersey finger. Orthopaedic Clinics, 45(1), 45-53."
    ],
    expertSources: ["John Leddy", "Hill Hastings", "Michael Hausman"]
  },
  {
    userId: 1,
    title: "Mechanic with Hypothenar Hammer Syndrome",
    patientDescription: "A 48-year-old mechanic with cold, painful ring and little fingers after years of using palm as hammer.",
    history: "20-year career using palm to strike objects. Recent onset of cold intolerance and color changes in ulnar digits. Pain and numbness with cold exposure.",
    presentingSymptoms: "Ring and little fingers turn white then blue in cold. Constant aching pain (5/10) in hypothenar region. Weak grip.",
    vitalSigns: "BP: 134/82, HR: 72, Temp: 36.5°C, RR: 16",
    bodyPart: "hand",
    complexity: "advanced",
    hiddenFindings: {
      strength: "4/5 grip strength. Normal intrinsic strength. Weak with sustained grip.",
      palpation: "Tender over hypothenar eminence. Diminished ulnar pulse. Positive Allen's test.",
      specialTests: "Abnormal Allen's test - delayed ulnar filling. Positive cold stress test.",
      rangeOfMotion: "Full ROM all joints. No contractures.",
      additionalObservations: "Digital color changes with cold exposure. Possible ulnar artery thrombosis."
    },
    correctDiagnosis: "Hypothenar Hammer Syndrome",
    differentialDiagnoses: ["Raynaud's Phenomenon", "Thoracic Outlet Syndrome", "Ulnar Nerve Compression", "Vibration White Finger"],
    correctAssessmentApproach: [
      "Detailed occupational history",
      "Vascular assessment (Allen's test, Doppler)",
      "Cold stress testing",
      "Neurological assessment",
      "Consider angiography for definitive diagnosis"
    ],
    correctTreatmentApproach: "Immediate cessation of trauma to palm. Tool modification with padding and anti-vibration gloves. Calcium channel blockers for vasospasm. Antiplatelet therapy if thrombosis. Cold avoidance and protection. Consider sympathectomy or arterial reconstruction for severe cases. Education on proper tool use essential for prevention of progression.",
    researchBasis: [
      "Ablett, C. T., & Hackett, L. A. (2008). Hypothenar hammer syndrome. Canadian Journal of Plastic Surgery, 16(4), 231-235.",
      "Ferris, B. L., et al. (2000). Hypothenar hammer syndrome. Southern Medical Journal, 93(10), 996-1000."
    ],
    expertSources: ["James Urbaniak", "Allen Van Beek", "Neil Jones"]
  }
];

// Function to add sample case studies to the database
export async function addSampleCaseStudies(storage: any): Promise<void> {
  console.log(`Adding ${sampleCaseStudies.length} sample case studies...`);
  
  for (const caseStudy of sampleCaseStudies) {
    try {
      // Check if a case study with the same title already exists
      const existingCases = await storage.getAICaseStudies();
      const exists = existingCases.caseStudies.some((c: any) => 
        c.title === caseStudy.title && c.bodyPart === caseStudy.bodyPart
      );
      
      if (!exists) {
        await storage.createAICaseStudy(caseStudy);
        console.log(`Added case study: ${caseStudy.title}`);
      } else {
        console.log(`Case study already exists: ${caseStudy.title}`);
      }
    } catch (error) {
      console.error(`Error adding case study ${caseStudy.title}:`, error);
    }
  }
  
  console.log("Sample case studies added successfully!");
}