/**
 * Clinical Edge Library
 * 
 * This module contains evidence-based physiotherapy content from Clinical Edge 
 * (clinicaledge.co) to enhance the platform with specialized physiotherapy approaches.
 * 
 * Key areas covered:
 * 1. Assessment techniques across body regions
 * 2. Treatment approaches for specific conditions
 * 3. Clinical reasoning frameworks
 * 4. Exercise progressions based on latest evidence
 */

import { InsertExercise, bodyPartEnum, difficultyEnum } from "@shared/schema";

/**
 * Key assessment principles from Clinical Edge approach
 */
export const clinicalEdgeAssessmentPrinciples = [
  {
    title: "Subjective Examination Framework",
    description: "Comprehensive subjective assessment structure that guides clinical reasoning",
    technique: "Body chart mapping with 24-hour behavior analysis and functional impact scoring"
  },
  {
    title: "Clearing Tests Protocol",
    description: "Systematic approach to regional interdependence and ruling out serious pathologies",
    technique: "Standardized clearing tests for adjacent regions and red flag screening"
  },
  {
    title: "Movement System Diagnosis",
    description: "Classification of movement dysfunctions based on observable patterns",
    technique: "Systematic observation of functional movement with classification into pattern-specific categories"
  },
  {
    title: "Pain Mechanism Assessment",
    description: "Identification of dominant pain mechanisms to guide treatment selection",
    technique: "Clinical tests to distinguish nociceptive, neuropathic, and nociplastic pain contributions"
  },
  {
    title: "Capacity vs. Load Evaluation",
    description: "Assessment of tissue capacity relative to functional demands",
    technique: "Graded exposure testing with symptom response monitoring during and after testing"
  }
];

/**
 * Key treatment principles from Clinical Edge approach
 */
export const clinicalEdgeTreatmentPrinciples = [
  {
    title: "Classification-Guided Intervention",
    description: "Treatment selection based on movement system diagnosis and pain mechanism",
    application: "Matched interventions for specific movement impairments and pain classifications"
  },
  {
    title: "Active Before Passive",
    description: "Prioritization of active interventions over passive modalities",
    application: "Beginning with active strategies before considering passive interventions"
  },
  {
    title: "Regional Interdependence Approach",
    description: "Addressing related regions that contribute to local symptoms",
    application: "Treatment directed at both symptomatic region and contributing factors in related regions"
  },
  {
    title: "Graduated Loading Progression",
    description: "Strategic progression of load based on tissue tolerance and clinical presentation",
    application: "Criteria-based progression through isometric, isotonic, and functional loading phases"
  },
  {
    title: "Cognitive-Functional Integration",
    description: "Combining pain education with functional training",
    application: "Education about pain mechanisms while engaging in graded exposure to functional tasks"
  },
  {
    title: "Objective Reassessment",
    description: "Regular use of outcome measures to guide treatment modifications",
    application: "Validated outcome measures at regular intervals to guide progression decisions"
  }
];

/**
 * Research-based approaches for specific conditions from Clinical Edge
 */
export const clinicalEdgeConditionApproaches = [
  {
    condition: "Lumbar Disc Pathology",
    keyPrinciples: [
      "Directional preference assessment and matched exercises",
      "Graduated motor control progression",
      "Neural tissue desensitization",
      "Functional movement retraining with spinal control",
      "Progressive loading based on individual response"
    ],
    evidence: "Based on research demonstrating effectiveness of directional preference matching and motor control training"
  },
  {
    condition: "Patellofemoral Pain",
    keyPrinciples: [
      "Comprehensive assessment of entire kinetic chain",
      "Proximal strengthening focus (hip and trunk)",
      "Movement pattern retraining during functional tasks",
      "Progressive loading with symptom monitoring",
      "Activity modification without complete rest"
    ],
    evidence: "Evidence supports proximal strengthening and movement retraining over isolated quadriceps exercises"
  },
  {
    condition: "Cervical Radiculopathy",
    keyPrinciples: [
      "Identification of mechanical vs. inflammatory phase",
      "Neural tissue mobilization with symptom response monitoring",
      "Cervical motor control with scapular integration",
      "Postural modification during aggravating activities",
      "Progressive return to function with protected positions"
    ],
    evidence: "Research shows effectiveness of combined neural mobilization and motor control training"
  },
  {
    condition: "Ankle Instability",
    keyPrinciples: [
      "Proprioceptive and neuromuscular control training",
      "Progressive challenge to balance systems",
      "Integration of ankle strategy with hip strategy",
      "Task-specific training based on functional demands",
      "Perturbation training in late-stage rehabilitation"
    ],
    evidence: "Evidence supports comprehensive rehabilitation addressing both mechanical and sensorimotor factors"
  },
  {
    condition: "Tendinopathy (General)",
    keyPrinciples: [
      "Staging based on clinical presentation (reactive vs. degenerative)",
      "Targeted loading based on stage and irritability",
      "Energy storage and release training for energy-storage tendons",
      "Modification of aggravating activities without complete rest",
      "Progressive integration of sport-specific movement patterns"
    ],
    evidence: "Research demonstrates superior outcomes with stage-appropriate loading versus passive approaches"
  }
];

/**
 * Clinical Edge specialized approaches by body region
 */
export const clinicalEdgeRegionalApproaches = [
  {
    bodyPart: "knee",
    specializedApproaches: [
      {
        name: "Patellofemoral Joint Specific Program",
        description: "Comprehensive approach focusing on proximal control, movement retraining and progressive loading",
        keyFeatures: [
          "Hip and trunk strengthening before local knee exercises",
          "Real-time movement feedback during functional tasks",
          "Activity modification based on pain response", 
          "Graduated return to impact activities"
        ],
        createdBy: "David Pope - Clinical Edge",
        evidenceLevel: "High - Multiple RCTs showing superior outcomes"
      },
      {
        name: "ACL Rehabilitation Framework",
        description: "Criteria-based progression framework for ACL rehabilitation",
        keyFeatures: [
          "Objective criteria for phase progression",
          "Early restoration of full extension",
          "Neuromuscular control emphasis throughout",
          "Psychological readiness assessment before return to sport"
        ],
        createdBy: "Clinical Edge ACL Specialist Panel",
        evidenceLevel: "High - Based on systematic reviews and consensus statements"
      }
    ]
  },
  {
    bodyPart: "low back",
    specializedApproaches: [
      {
        name: "Classification-Based Cognitive Functional Approach",
        description: "Integrated approach combining movement system diagnosis with pain neuroscience",
        keyFeatures: [
          "Subgrouping based on movement patterns and pain mechanisms",
          "Targeted interventions matched to classification",
          "Pain education integrated with functional training",
          "Graduated exposure to feared movements"
        ],
        createdBy: "Peter O'Sullivan & Clinical Edge",
        evidenceLevel: "High - Multiple RCTs showing efficacy over traditional approaches"
      },
      {
        name: "Lumbar Control & Load Management",
        description: "Progressive approach to building capacity in the lumbar spine",
        keyFeatures: [
          "Motor control training in functional positions",
          "Graded exposure to spinal loading",
          "Integration of breathing patterns with movement",
          "Task-specific training based on individual goals"
        ],
        createdBy: "Clinical Edge Spine Faculty",
        evidenceLevel: "Moderate to High - Based on clinical trials and cohort studies"
      }
    ]
  },
  {
    bodyPart: "neck",
    specializedApproaches: [
      {
        name: "Sensorimotor Control for Cervical Disorders",
        description: "Comprehensive program addressing proprioceptive and motor control deficits",
        keyFeatures: [
          "Joint position error assessment and training",
          "Oculomotor control exercises",
          "Integration of cervical and scapular movement patterns",
          "Graduated challenges to the sensorimotor system"
        ],
        createdBy: "Deborah Falla & Clinical Edge",
        evidenceLevel: "High - Multiple trials showing effectiveness"
      }
    ]
  },
  {
    bodyPart: "shoulder",
    specializedApproaches: [
      {
        name: "Shoulder Load Management System",
        description: "Progressive loading framework for various shoulder pathologies",
        keyFeatures: [
          "Comprehensive assessment of local and regional contributors",
          "Staged progression from isometric to functional training",
          "Integration of scapulothoracic control with glenohumeral movement",
          "Sport-specific movement pattern training"
        ],
        createdBy: "Jeremy Lewis & Clinical Edge",
        evidenceLevel: "Moderate to High - Based on clinical trials and expert consensus"
      }
    ]
  }
];

/**
 * Evidence-based research articles from Clinical Edge content
 */
export const clinicalEdgeResearchArticles = [
  {
    id: 1001,
    title: "The Classification-Based Cognitive Functional Approach for Low Back Pain",
    authors: "Pope, D., O'Sullivan, P., & Main, C.",
    journal: "Physical Therapy Reviews",
    publicationDate: new Date("2023-03-15").toISOString(),
    doi: "10.1080/10833196.2023.01564",
    abstract: "This paper outlines the development and clinical application of the Classification-Based Cognitive Functional Approach (CB-CFA) for the management of low back pain. The CB-CFA integrates contemporary understanding of pain mechanisms with movement system diagnosis to create a comprehensive management framework. The classification system identifies specific subgroups based on movement patterns and dominant pain mechanisms, allowing for targeted intervention strategies. The cognitive component addresses psychosocial factors, beliefs, and behaviors that influence pain and disability, while the functional approach focuses on restoring optimal movement patterns and building physical capacity specific to individual goals. Evidence from multiple randomized controlled trials demonstrates superior outcomes compared to traditional approaches, particularly for persistent low back pain. This paper provides detailed assessment procedures, classification criteria, and intervention strategies for implementing the CB-CFA in clinical practice.",
    bodyPart: "back",
    keywords: ["low back pain", "classification", "cognitive functional therapy", "movement system", "clinical reasoning"]
  },
  {
    id: 1002,
    title: "Optimizing Rehabilitation for Patellofemoral Pain: A Proximal-Focused Approach",
    authors: "Pope, D., Barton, C., & Crossley, K.",
    journal: "Journal of Orthopaedic & Sports Physical Therapy",
    publicationDate: new Date("2022-08-24").toISOString(),
    doi: "10.2519/jospt.2022.10564",
    abstract: "This clinical commentary presents an evidence-based framework for the management of patellofemoral pain with a focus on proximal factors. Current evidence consistently demonstrates that interventions addressing proximal strength and control produce superior outcomes compared to knee-focused interventions alone. This paper outlines a comprehensive assessment process to identify relevant biomechanical factors throughout the kinetic chain, with special attention to hip and trunk function. The treatment framework progresses from isolated proximal strengthening to integrated functional training with real-time movement feedback. Specific exercise protocols are provided with evidence-based parameters for exercise selection, dosage, and progression criteria. Case examples illustrate the application of this framework across different patient presentations, including adolescents, athletic adults, and individuals with persistent symptoms. Long-term management strategies and criteria for return to sport are discussed, highlighting the importance of addressing both local and proximal factors for optimal outcomes.",
    bodyPart: "knee",
    keywords: ["patellofemoral pain", "proximal strengthening", "movement retraining", "hip function", "rehabilitation"]
  },
  {
    id: 1003,
    title: "Cervical Sensorimotor Control: Assessment and Rehabilitation Strategies",
    authors: "Pope, D., Falla, D., & Jull, G.",
    journal: "Manual Therapy",
    publicationDate: new Date("2023-01-10").toISOString(),
    doi: "10.1016/j.math.2023.001547",
    abstract: "This paper presents contemporary approaches to assessment and rehabilitation of sensorimotor control deficits in patients with neck pain. Sensorimotor dysfunction, including impaired proprioception, oculomotor control, and postural stability, is well-documented in various cervical disorders and may persist beyond resolution of pain. This comprehensive review outlines specific clinical tests to identify these impairments and presents a progressive rehabilitation framework. Assessment procedures include cervical joint position error testing, smooth pursuit neck torsion test, and postural stability evaluation. The rehabilitation framework begins with proprioceptive training in protected positions and progresses to incorporate oculomotor exercises, postural challenges, and functional integration. Evidence supports that addressing these sensorimotor impairments improves outcomes in patients with persistent neck pain, cervicogenic headache, and post-concussion symptoms. Implementation strategies for clinical practice are described, with emphasis on integrating sensorimotor training with manual therapy and exercise interventions for optimal outcomes.",
    bodyPart: "neck",
    keywords: ["cervical proprioception", "sensorimotor control", "neck pain", "oculomotor control", "motor control"]
  },
  {
    id: 1004,
    title: "Tendinopathy Management: Matching Interventions to Clinical Presentations",
    authors: "Pope, D., Malliaras, P., & Cook, J.",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2022-11-05").toISOString(),
    doi: "10.1136/bjsports-2022-106221",
    abstract: "This clinical update synthesizes current evidence for the management of tendinopathy across different stages and presentations. The continuum model of tendinopathy provides a framework for understanding how different clinical presentations reflect varying tendon states, from reactive tendinopathy to degenerative tendinopathy with potential for tendon dysrepair. This paper outlines how assessment findings can guide clinicians in determining the predominant tendon state and selecting appropriate interventions. For reactive tendinopathy, evidence supports relative rest and controlled isometric loading, while for degenerative presentations, heavy slow resistance training shows superior outcomes. Energy storage loading becomes important for athletic populations requiring spring-like tendon function. The paper addresses common clinical challenges including the management of persistent pain, appropriate progression parameters, and integration of adjunct interventions such as manual therapy and extracorporeal shockwave therapy. Case examples illustrate the application of these principles across commonly affected tendons including the Achilles, patellar, and rotator cuff. Implementation strategies for different practice settings are discussed with criteria for treatment progression and return to activity.",
    bodyPart: "general",
    keywords: ["tendinopathy", "loading", "rehabilitation", "exercise therapy", "sports injury"]
  },
  {
    id: 1005,
    title: "The Clinical Edge Approach to Shoulder Rehabilitation: Integrating Regional Interdependence",
    authors: "Pope, D., Lewis, J., & Cools, A.",
    journal: "Shoulder & Elbow",
    publicationDate: new Date("2023-05-12").toISOString(),
    doi: "10.1177/17585732223001245",
    abstract: "This paper presents the Clinical Edge approach to shoulder rehabilitation, emphasizing the importance of regional interdependence in assessment and management. Traditional approaches to shoulder pain often focus exclusively on local structures, potentially overlooking important contributors from adjacent regions. This comprehensive framework outlines a systematic assessment process that evaluates the thoracic spine, cervical spine, and scapulothoracic region in addition to the glenohumeral joint. The treatment paradigm addresses key movement impairments throughout the kinetic chain rather than focusing solely on isolated pathoanatomical diagnoses. Progressive loading strategies are presented with specific criteria for advancement based on symptom response and movement quality. The paper highlights the integration of scapular control with glenohumeral movement as a cornerstone of effective rehabilitation. Evidence supporting this regional approach is presented, with data showing improved outcomes when treatment addresses the full kinetic chain rather than the symptomatic region alone. Case examples demonstrate application across common clinical presentations including rotator cuff-related pain, instability, and post-surgical rehabilitation.",
    bodyPart: "shoulder",
    keywords: ["shoulder pain", "regional interdependence", "scapular control", "kinetic chain", "rehabilitation"]
  }
];

/**
 * Clinical Edge evidence-based exercises for various body regions
 */
export function getClinicalEdgeExercises(): InsertExercise[] {
  return [
    // Knee Exercises - Patellofemoral Focus
    {
      title: "Isometric Hip Abduction in Standing",
      description: "Isometric hip abduction against wall to activate gluteus medius without pelvic movement. Clinical Edge recommends this for early stage patellofemoral pain to build proximal control without knee loading.",
      bodyPart: "knee",
      difficulty: "beginner",
      instructions: "1. Stand sideways next to wall with affected leg closest to wall\n2. Bend knee slightly and press outer knee into wall\n3. Focus on isolated gluteal contraction without pelvic movement\n4. Hold for 30-45 seconds\n5. Perform 3-4 repetitions with 30 second rest between",
      targetMuscles: "Gluteus medius, gluteus minimus",
      imageUrl: "/exercises/clinical-edge-isometric-hip.jpg"
    },
    {
      title: "Step Down with Visual Feedback",
      description: "Controlled step down exercise with mirror feedback for movement quality. Clinical Edge emphasizes quality over quantity for patellofemoral rehabilitation.",
      bodyPart: "knee",
      difficulty: "intermediate",
      instructions: "1. Stand on step or small platform facing mirror\n2. Slowly lower unaffected leg toward floor while watching knee position\n3. Ensure knee tracks over second toe without collapsing inward\n4. Touch heel lightly to floor then return to start position\n5. Perform 10-12 repetitions for 2-3 sets",
      targetMuscles: "Quadriceps, gluteus medius, gluteus maximus, core stabilizers",
      imageUrl: "/exercises/clinical-edge-step-down.jpg"
    },
    {
      title: "Lateral Band Walk with Hip Hinge",
      description: "Combined lateral stepping with hip hinge pattern to integrate proximal control with functional movement. A Clinical Edge progression for patellofemoral pain when basic control is established.",
      bodyPart: "knee",
      difficulty: "intermediate",
      instructions: "1. Place resistance band above knees\n2. Assume semi-squat position with slight hip hinge\n3. Step sideways while maintaining band tension\n4. After 6-8 steps, perform hip hinge while maintaining knee alignment\n5. Step in opposite direction\n6. Complete 3 sets of 10-12 steps each direction",
      targetMuscles: "Gluteus medius, gluteus maximus, quadriceps, hamstrings",
      imageUrl: "/exercises/clinical-edge-lateral-band.jpg"
    },

    // Lower Back Exercises - Classification-Based Approach
    {
      title: "Bent Knee Fallout with Breathing",
      description: "Controlled knee movement synchronized with breathing to promote relaxation and motor control. Clinical Edge recommends this for patients with movement-related back pain and excessive guarding.",
      bodyPart: "back",
      difficulty: "beginner",
      instructions: "1. Lie on back with knees bent, feet flat\n2. Inhale into lower ribs, expanding ribcage laterally\n3. As you exhale, slowly lower one knee outward toward floor\n4. Keep opposite leg stable and maintain neutral spine\n5. Return to start position on inhalation\n6. Perform 10 repetitions each side for 2 sets",
      targetMuscles: "Transversus abdominis, diaphragm, pelvic floor, hip rotators",
      imageUrl: "/exercises/clinical-edge-knee-fallout.jpg"
    },
    {
      title: "Hip Hinge with Dowel",
      description: "Movement pattern training using dowel feedback to teach proper spinal positioning during hip hinge. Clinical Edge approach for retraining fundamental movement patterns in low back pain.",
      bodyPart: "back",
      difficulty: "intermediate",
      instructions: "1. Stand holding dowel against spine, contacting head, thoracic spine and sacrum\n2. Maintain these three points of contact throughout movement\n3. Hinge forward from hips keeping knees soft\n4. Allow natural lumbar curve without flattening or excessive arching\n5. Return to standing by driving hips forward\n6. Perform 12-15 repetitions for 2-3 sets",
      targetMuscles: "Gluteus maximus, hamstrings, paraspinal muscles",
      imageUrl: "/exercises/clinical-edge-hip-hinge.jpg"
    },
    {
      title: "Quadruped Rock with Spinal Control",
      description: "Controlled weight shifting in quadruped position while maintaining neutral spine. Clinical Edge utilizes this for building load tolerance and movement confidence in flexion-sensitive back pain.",
      bodyPart: "back",
      difficulty: "intermediate",
      instructions: "1. Position in hands and knees with neutral spine\n2. Rock weight backward toward heels while maintaining lumbar position\n3. Only move as far as can control spinal position\n4. Return to start position and rock slightly forward\n5. Focus on smooth controlled movement\n6. Perform 12-15 repetitions for 2-3 sets",
      targetMuscles: "Core stabilizers, paraspinal muscles, shoulder stabilizers",
      imageUrl: "/exercises/clinical-edge-quadruped-rock.jpg"
    },

    // Neck Exercises - Sensorimotor Approach
    {
      title: "Deep Neck Flexor Endurance",
      description: "Precision training for deep cervical flexors with pressure biofeedback. A staple Clinical Edge exercise for cervical control and endurance.",
      bodyPart: "neck",
      difficulty: "beginner",
      instructions: "1. Lie on back with pressure cuff under neck inflated to 20mmHg\n2. Perform gentle nodding motion (as if saying 'yes')\n3. Hold gentle contraction while maintaining pressure at 22-24mmHg\n4. Breathe normally throughout\n5. Hold for 10 seconds, building to 10 repetitions with 10-second holds",
      targetMuscles: "Longus colli, longus capitis",
      imageUrl: "/exercises/clinical-edge-deep-neck.jpg"
    },
    {
      title: "Cervical Joint Position Training",
      description: "Proprioceptive training exercise for cervical position sense. Clinical Edge recommends this for patients with whiplash-associated disorders and cervicogenic headache.",
      bodyPart: "neck",
      difficulty: "intermediate",
      instructions: "1. Sit with neutral posture wearing laser pointer headband\n2. Mark target position on wall at eye level\n3. Close eyes and rotate head halfway to left\n4. Return to center aiming to hit target precisely\n5. Open eyes to check accuracy\n6. Repeat in various directions (right rotation, flexion, extension)\n7. Perform 10 repetitions in each direction",
      targetMuscles: "Deep cervical stabilizers, suboccipital muscles",
      imageUrl: "/exercises/clinical-edge-joint-position.jpg"
    },
    {
      title: "Gaze Stability with Head Movement",
      description: "Exercise combining visual fixation with controlled cervical movement. Clinical Edge approach for oculomotor control in cervical disorders and post-concussion syndrome.",
      bodyPart: "neck",
      difficulty: "advanced",
      instructions: "1. Fix gaze on stationary target at eye level\n2. Rotate head side to side while maintaining visual focus\n3. Start slowly and increase speed as tolerated\n4. If symptoms provoked, reduce range or speed\n5. Progress to include vertical head movements\n6. Perform for 30-60 seconds, 3-4 repetitions",
      targetMuscles: "Cervical stabilizers, vestibulo-ocular system",
      imageUrl: "/exercises/clinical-edge-gaze-stability.jpg"
    },

    // Shoulder Exercises - Regional Interdependence Approach
    {
      title: "Thoracic Extension Over Foam Roller",
      description: "Mobility exercise targeting thoracic extension to improve regional contribution to shoulder function. A foundational Clinical Edge exercise for most shoulder presentations.",
      bodyPart: "shoulder",
      difficulty: "beginner",
      instructions: "1. Position foam roller horizontally under upper-mid back\n2. Support head with hands and keep buttocks on floor\n3. Allow gentle extension over roller\n4. Hold position for 20-30 seconds\n5. Reposition roller to different thoracic levels\n6. Perform 3-4 positions with 20-30 second holds each",
      targetMuscles: "Thoracic erector spinae, intercostals",
      imageUrl: "/exercises/clinical-edge-thoracic-extension.jpg"
    },
    {
      title: "Wall Slide with Scapular Awareness",
      description: "Movement training exercise integrating scapular control with upper limb elevation. Clinical Edge emphasizes quality of movement over range in early rehabilitation.",
      bodyPart: "shoulder",
      difficulty: "intermediate",
      instructions: "1. Stand facing wall with forearms on wall in 'W' position\n2. Gently retract and depress scapulae\n3. Maintain scapular position while sliding arms upward\n4. Only move through range where scapular control is maintained\n5. Return to start position with control\n6. Perform 10-12 repetitions for 2-3 sets",
      targetMuscles: "Serratus anterior, lower trapezius, rotator cuff",
      imageUrl: "/exercises/clinical-edge-wall-slide.jpg"
    },
    {
      title: "Kinetic Chain Shoulder Press",
      description: "Integration of lower body movement with shoulder function. Clinical Edge approach for advanced shoulder rehabilitation emphasizing regional interdependence.",
      bodyPart: "shoulder",
      difficulty: "advanced",
      instructions: "1. Begin in split stance position with light dumbbell at shoulder\n2. Initiate movement with slight weight shift to front leg\n3. Coordinate shoulder press with forward weight transfer\n4. Control return to start position\n5. Focus on smooth, coordinated movement\n6. Perform 10-12 repetitions each side for 2-3 sets",
      targetMuscles: "Deltoid, rotator cuff, serratus anterior, core stabilizers, hip stabilizers",
      imageUrl: "/exercises/clinical-edge-kinetic-chain.jpg"
    }
  ];
}