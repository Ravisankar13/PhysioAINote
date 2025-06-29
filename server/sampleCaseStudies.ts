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