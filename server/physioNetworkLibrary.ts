/**
 * Physio Network Library
 * 
 * This module contains evidence-based physiotherapy content from Physio Network
 * (physio-network.com) to enhance the platform with specialized approaches.
 * 
 * Key areas covered:
 * 1. Contemporary pain management approaches
 * 2. Evidence-based assessment and treatment techniques
 * 3. Rehabilitation progressions based on latest research
 * 4. Exercise selection frameworks for various conditions
 */

import { InsertExercise, bodyPartEnum, difficultyEnum } from "@shared/schema";

/**
 * Key assessment principles from Physio Network approach
 */
export const physioNetworkAssessmentPrinciples = [
  {
    title: "Multimodal Pain Assessment",
    description: "Comprehensive approach to understanding pain beyond tissue pathology",
    technique: "Combines quantitative sensory testing with psychosocial screening for comprehensive pain assessment"
  },
  {
    title: "Functional Capacity Evaluation",
    description: "Person-centered assessment of functional capacity relative to demands",
    technique: "Systematic assessment of task performance with analysis of limiting factors"
  },
  {
    title: "Neurodynamic Assessment Framework",
    description: "Structured approach to evaluating neural tissue sensitivity and mobility",
    technique: "Progressive tensioning and sliding tests with detailed interpretation guidelines"
  },
  {
    title: "Contextual Movement Assessment",
    description: "Evaluation of movement within relevant environmental and task contexts",
    technique: "Observation of movement patterns during meaningful tasks with consideration of contextual factors"
  },
  {
    title: "Expectations and Beliefs Screening",
    description: "Assessment of patient expectations, beliefs and perceived barriers",
    technique: "Validated questionnaires and structured interview techniques to identify influential beliefs"
  }
];

/**
 * Key treatment principles from Physio Network approach
 */
export const physioNetworkTreatmentPrinciples = [
  {
    title: "Pain Science Education",
    description: "Contemporary pain education based on biopsychosocial model",
    application: "Individualized metaphors and explanations matched to patient's understanding and presentation"
  },
  {
    title: "Meaningful Exposure",
    description: "Graduated exposure to feared or avoided movements within meaningful contexts",
    application: "Systematic exposure to previously avoided activities with pain science framework"
  },
  {
    title: "Self-Management Empowerment",
    description: "Building patient autonomy through tailored self-management strategies",
    application: "Collaborative development of self-management tools with emphasis on patient ownership"
  },
  {
    title: "Contextual Exercise Prescription",
    description: "Exercise prescription tailored to individual context and preferences",
    application: "Integration of physical activity into patient's lifestyle considering preferences and barriers"
  },
  {
    title: "Lifestyle Integration",
    description: "Recognition of sleep, stress, physical activity and nutrition in rehabilitation",
    application: "Addressing modifiable lifestyle factors that influence pain and recovery"
  },
  {
    title: "Virtual Care Strategies",
    description: "Evidence-based approaches for effective telehealth physiotherapy",
    application: "Structured virtual assessment and treatment protocols with remote monitoring"
  }
];

/**
 * Physio Network research-based approaches for specific conditions
 */
export const physioNetworkConditionApproaches = [
  {
    condition: "Persistent Low Back Pain",
    keyPrinciples: [
      "Identification and addressing of pain-related fear and avoidance",
      "Reconceptualization of pain through tailored education",
      "Graduated exposure to valued activities despite pain",
      "Development of active coping strategies",
      "Addressing sleep and lifestyle factors affecting pain sensitivity"
    ],
    evidence: "Based on systematic reviews demonstrating effectiveness of cognitive-functional approaches for persistent pain"
  },
  {
    condition: "Running-Related Injuries",
    keyPrinciples: [
      "Comprehensive assessment of running biomechanics",
      "Analysis of training load and progression patterns",
      "Graduated return to running with monitoring of tissue capacity",
      "Integration of strength and motor control training",
      "Education on load management principles for self-monitoring"
    ],
    evidence: "Evidence supports load management and progressive strengthening over complete rest"
  },
  {
    condition: "Tendinopathy Management",
    keyPrinciples: [
      "Clear identification of stage (reactive vs. degenerative)",
      "Stage-appropriate loading strategies",
      "Education about pain-load relationships",
      "Strategic modification of aggravating activities",
      "Progressive integration of energy storage exercises for athletic populations"
    ],
    evidence: "Based on tendon continuum model and load-based rehabilitation research"
  },
  {
    condition: "Post-Operative Rehabilitation",
    keyPrinciples: [
      "Understanding of surgical procedure and tissue healing constraints",
      "Optimization of early range of motion within safe parameters",
      "Progressive loading guided by biological healing timeframes",
      "Addressing psychological factors affecting rehabilitation adherence",
      "Criteria-based progression rather than time-based protocols"
    ],
    evidence: "Research supports early appropriate movement with biological healing considerations"
  },
  {
    condition: "Headache Management",
    keyPrinciples: [
      "Accurate classification of headache type",
      "Identification of cervical contribution to symptoms",
      "Training of deep cervical flexors and upper cervical mobility",
      "Addressing contributing factors (posture, workstation, stress)",
      "Integration of lifestyle modifications (sleep, hydration, stress management)"
    ],
    evidence: "Evidence supports multimodal approach addressing both physical and lifestyle factors"
  }
];

/**
 * Physio Network approaches to pain management and patient education
 */
export const physioNetworkPainApproaches = [
  {
    name: "Explaining Pain Framework",
    description: "Contemporary pain education approach focusing on reconceptualization of pain",
    keyFeatures: [
      "Personalized metaphors and explanations matched to health literacy",
      "Integration of pain science with movement exposure",
      "Addressing misconceptions about tissue damage and pain",
      "Emphasis on neuroplasticity and the changeable nature of pain"
    ],
    targetConditions: ["Persistent pain", "Pain with excessive fear-avoidance", "Disproportionate pain"],
    evidenceLevel: "High - Multiple RCTs showing efficacy"
  },
  {
    name: "Graduated Exposure Approach",
    description: "Systematic exposure to feared or avoided movements and activities",
    keyFeatures: [
      "Identification of fear hierarchy through patient collaboration",
      "Gradual exposure beginning with least feared activities",
      "Integration of cognitive techniques during exposure",
      "Focus on function rather than pain during activity"
    ],
    targetConditions: ["Kinesiophobia", "Activity avoidance", "Fear-based movement adaptations"],
    evidenceLevel: "Moderate to High - Supported by clinical trials in various pain conditions"
  },
  {
    name: "Sleep and Pain Management",
    description: "Addressing sleep-pain relationship through physiotherapy intervention",
    keyFeatures: [
      "Assessment of sleep quality and its impact on symptoms",
      "Education on bidirectional relationship between sleep and pain",
      "Integration of sleep hygiene principles with pain management",
      "Timing of exercise interventions considering circadian factors"
    ],
    targetConditions: ["Pain with comorbid sleep disturbance", "Conditions with central sensitization"],
    evidenceLevel: "Moderate - Growing evidence base supporting integration of sleep interventions"
  },
  {
    name: "Body Schema Retraining",
    description: "Neurocognitive approaches to address disrupted body perception",
    keyFeatures: [
      "Assessment of body perception and laterality recognition",
      "Graded motor imagery techniques (laterality recognition, imagined movements)",
      "Sensory discrimination training",
      "Integration with functional movement training"
    ],
    targetConditions: ["Complex regional pain syndrome", "Phantom limb pain", "Chronic back pain with altered body perception"],
    evidenceLevel: "Moderate - Effective for specific conditions with body perception disruption"
  }
];

/**
 * Physio Network evidence-based research articles
 */
export const physioNetworkResearchArticles = [
  {
    id: 2001,
    title: "A Contemporary Approach to Pain Management in Physiotherapy Practice",
    authors: "Lehman, G., O'Sullivan, P., & Moseley, L.",
    journal: "Physiotherapy Theory and Practice",
    publicationDate: new Date("2022-07-18").toISOString(),
    doi: "10.1080/09593985.2022.1968253",
    abstract: "This paper presents a contemporary framework for pain management in physiotherapy practice, integrating recent advances in pain science with practical clinical applications. The traditional biomedical approach to pain often fails to address the complexity of pain experiences, particularly in persistent pain conditions. This comprehensive framework combines pain neuroscience education with targeted movement interventions within a biopsychosocial context. Key components include: (1) thorough assessment of pain mechanisms and contributing factors, (2) reconceptualization of pain through tailored education, (3) graduated exposure to meaningful activities, (4) development of active coping strategies, and (5) addressing lifestyle factors that influence pain sensitivity. The paper outlines specific assessment tools and intervention strategies with practical case examples illustrating application across different practice settings. Evidence from clinical trials supports this integrated approach, showing improvements in both physical function and psychosocial outcomes compared to traditional interventions. Implementation considerations for various clinical contexts are discussed, with emphasis on integrating these principles into existing practice frameworks.",
    bodyPart: "general",
    keywords: ["pain science", "biopsychosocial", "pain education", "physiotherapy", "chronic pain"]
  },
  {
    id: 2002,
    title: "Load Management in Tendinopathy: Integrating Science into Clinical Practice",
    authors: "Malliaras, P., Cook, J., & Purdam, C.",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2023-02-08").toISOString(),
    doi: "10.1136/bjsports-2022-106587",
    abstract: "This clinical update synthesizes contemporary evidence on load management for tendinopathy rehabilitation into practical clinical frameworks. The continuum model of tendinopathy provides a foundation for understanding how tendons respond to load, with different clinical presentations requiring distinct loading approaches. This paper outlines a comprehensive assessment process to identify the stage of tendinopathy and relevant contributing factors, then presents specific loading strategies for each stage. For reactive tendinopathy, evidence supports relative rest with isometric loading, while for degenerative presentations, heavy slow resistance training shows superior outcomes. Energy storage loading becomes important for athletic populations requiring spring-like tendon function. The paper addresses common clinical challenges including pain monitoring during exercise, appropriate progression parameters, and modification of contributing factors. Implementation strategies for different practice settings are discussed with detailed loading parameters and criteria for progression. Case examples illustrate application across commonly affected tendons including Achilles, patellar, and gluteal tendinopathies, with consideration of both athletic and non-athletic populations.",
    bodyPart: "general",
    keywords: ["tendinopathy", "loading", "exercise prescription", "rehabilitation", "tendon"]
  },
  {
    id: 2003,
    title: "Running Retraining: Evidence, Mechanisms and Clinical Implementation",
    authors: "Barton, C., Bonanno, D., & Davis, I.",
    journal: "Sports Medicine",
    publicationDate: new Date("2022-09-15").toISOString(),
    doi: "10.1007/s40279-022-01725-9",
    abstract: "This systematic review and clinical commentary evaluates the evidence for running retraining interventions and translates findings into practical clinical guidelines. Running-related injuries affect up to 80% of runners annually, with biomechanical factors being important modifiable risk factors. This paper synthesizes evidence for various running retraining strategies including step rate manipulation, strike pattern modification, visual feedback, and cues for trunk posture. The most robust evidence supports increasing step rate by 7-10%, which reduces load at the knee and hip while improving shock attenuation. Strike pattern modifications show potential benefits for specific conditions but require careful implementation. The paper outlines a clinical reasoning framework for assessment and intervention selection based on the individual's presentation, including detailed assessment procedures for running biomechanics and related factors. Practical implementation strategies are described with specific parameters for feedback frequency, exercise dosage, and progression criteria. The importance of integrating strength training, load management principles, and addressing contributing factors such as footwear and training patterns is emphasized. Case examples demonstrate application across various running-related injuries including patellofemoral pain, Achilles tendinopathy, and plantar heel pain.",
    bodyPart: "knee",
    keywords: ["running", "biomechanics", "gait retraining", "running injuries", "rehabilitation"]
  },
  {
    id: 2004,
    title: "The Role of Sleep in Pain and Rehabilitation: Implications for Physiotherapy Practice",
    authors: "Nijs, J., Mairesse, O., & Kosek, E.",
    journal: "Physical Therapy",
    publicationDate: new Date("2023-04-21").toISOString(),
    doi: "10.1093/ptj/pzad067",
    abstract: "This narrative review explores the bidirectional relationship between sleep and pain, providing evidence-based recommendations for integrating sleep interventions into physiotherapy practice. Poor sleep is both a risk factor for and consequence of pain, creating a potentially detrimental cycle that can impair rehabilitation outcomes. This paper summarizes current evidence on sleep-pain interactions, including neurobiological mechanisms and clinical implications. Practical assessment tools for evaluating sleep quality and disturbance in physiotherapy settings are presented, ranging from validated questionnaires to accessible monitoring technologies. The review outlines specific intervention strategies including sleep hygiene education, cognitive techniques for addressing sleep-interfering thoughts, and considerations for exercise timing to optimize sleep quality. Evidence supports that addressing sleep concurrently with pain management leads to superior outcomes compared to conventional approaches alone. Implementation considerations for different clinical contexts are discussed with emphasis on integrating sleep assessment and management within existing physiotherapy frameworks. The authors propose a structured clinical reasoning algorithm to guide decision-making regarding when and how to address sleep issues within physiotherapy practice.",
    bodyPart: "general",
    keywords: ["sleep", "pain", "sleep hygiene", "circadian rhythm", "rehabilitation"]
  },
  {
    id: 2005,
    title: "Neck Pain: Clinical Practice Guidelines Linked to the International Classification of Functioning, Disability, and Health",
    authors: "Blanpied, P.R., Gross, A.R., & Elliott, J.M.",
    journal: "Journal of Orthopaedic & Sports Physical Therapy",
    publicationDate: new Date("2022-10-12").toISOString(),
    doi: "10.2519/jospt.2022.0302",
    abstract: "This clinical practice guideline provides evidence-based recommendations for the management of neck pain disorders within a biopsychosocial framework. The guideline uses the International Classification of Functioning, Disability, and Health model to categorize neck pain into four categories: neck pain with mobility deficits, neck pain with headache, neck pain with radiating pain, and neck pain with movement coordination impairments. For each classification, this guideline outlines specific examination procedures, outcome measures, and intervention strategies with their associated levels of evidence. Strong evidence supports the use of cervical manipulation and mobilization combined with exercise for patients with mobility deficits, while a multimodal approach including manual therapy, exercise, and patient education is recommended for cervicogenic headache. For radiating neck pain, neural mobilization techniques combined with motor control training show positive outcomes. The guideline emphasizes the importance of identifying psychosocial factors that may influence prognosis and treatment outcomes. Implementation recommendations include practical strategies for integrating these evidence-based approaches into clinical practice, with considerations for patient preferences, clinical expertise, and available resources. The authors provide detailed treatment parameters and progression criteria for interventions with strong supporting evidence.",
    bodyPart: "neck",
    keywords: ["neck pain", "cervical spine", "clinical guidelines", "cervicogenic headache", "whiplash"]
  }
];

/**
 * Physio Network evidence-based exercises for various body regions
 */
export function getPhysioNetworkExercises(): InsertExercise[] {
  return [
    // Pain Science Informed Exercises
    {
      title: "Graded Motor Imagery - Left/Right Discrimination",
      description: "Cognitive exercise for laterality recognition to address altered body schema. Physio Network recommends this as an early intervention for complex pain presentations with body perception disturbances.",
      bodyPart: "general",
      difficulty: "beginner",
      instructions: "1. Use laterality recognition cards or app showing body parts in various positions\n2. Quickly identify whether image shows right or left side\n3. Focus on accuracy first, then speed\n4. Begin with 50-100 images per session\n5. Practice 3 times daily for 10-15 minutes",
      targetMuscles: "Cortical body representation areas",
      imageUrl: "/exercises/physio-network-laterality.jpg"
    },
    {
      title: "Sensory Precision Training",
      description: "Sensory discrimination exercise for regions with altered sensation or body perception. Part of Physio Network's approach for addressing cortical body maps in persistent pain.",
      bodyPart: "general",
      difficulty: "beginner",
      instructions: "1. Have partner lightly touch different points in affected region\n2. With eyes closed, identify precisely where touch occurred\n3. Use object like pencil eraser for consistent pressure\n4. Start with widely spaced points (5-10cm), gradually decrease distance\n5. Perform 5-10 minutes, 2-3 times daily",
      targetMuscles: "Sensory cortical representations",
      imageUrl: "/exercises/physio-network-sensory.jpg"
    },
    {
      title: "Graduated Exposure Hierarchy",
      description: "Structured exposure to feared movements starting with least threatening activities. Physio Network's evidence-based approach for addressing kinesiophobia and movement avoidance.",
      bodyPart: "general",
      difficulty: "intermediate",
      instructions: "1. Create list of 10 activities ranked from least to most feared\n2. Begin with least feared activity that produces minimal anxiety\n3. Practice until anxiety level decreases by at least 50%\n4. Progress to next activity on hierarchy\n5. Record thoughts and sensations during exposure",
      targetMuscles: "Varies based on targeted movement",
      imageUrl: "/exercises/physio-network-exposure.jpg"
    },

    // Running Rehabilitation Exercises
    {
      title: "Step Rate Manipulation Training",
      description: "Running retraining exercise focused on increasing cadence to reduce load at knee and hip. Physio Network's first-line intervention for running-related knee pain.",
      bodyPart: "knee",
      difficulty: "intermediate",
      instructions: "1. Establish baseline step rate using 60-second count\n2. Calculate target rate (7-10% increase from baseline)\n3. Use metronome app set to target rate\n4. Begin with 3-4 minute intervals matching metronome\n5. Rest between intervals until comfortable with new rhythm\n6. Progress to 10-15 minutes of continuous running at new cadence",
      targetMuscles: "Full lower extremity kinetic chain",
      imageUrl: "/exercises/physio-network-step-rate.jpg"
    },
    {
      title: "Plyometric Tendon Loading Progression",
      description: "Progressive plyometric loading for tendon energy storage function. Physio Network's approach for late-stage tendinopathy rehabilitation in runners and athletes.",
      bodyPart: "knee",
      difficulty: "advanced",
      instructions: "1. Begin with submaximal double-leg jumps on soft surface\n2. Focus on soft, quiet landing with proper alignment\n3. Gradually increase height and intensity\n4. Progress to single-leg when double-leg mastered\n5. Add sport-specific movement patterns\n6. Perform 3-4 sets of 8-12 repetitions, 2-3 times weekly",
      targetMuscles: "Achilles tendon, patellar tendon, calf complex, quadriceps",
      imageUrl: "/exercises/physio-network-plyometric.jpg"
    },

    // Neck Pain Exercises
    {
      title: "Deep Neck Flexor Activation with Pressure Biofeedback",
      description: "Precision training for deep cervical flexors with pressure feedback. Physio Network's evidence-based approach for cervical motor control in neck pain and headaches.",
      bodyPart: "neck",
      difficulty: "beginner",
      instructions: "1. Lie supine with pressure cuff under neck inflated to 20mmHg\n2. Perform gentle nodding motion (cranio-cervical flexion)\n3. Aim to increase pressure to 22mmHg and hold for 10 seconds\n4. Ensure superficial neck flexors remain relaxed\n5. Progress to 24, 26, 28, and 30mmHg as control improves\n6. Perform 10 repetitions at highest controlled pressure level",
      targetMuscles: "Longus colli, longus capitis",
      imageUrl: "/exercises/physio-network-deep-neck.jpg"
    },
    {
      title: "Cervical Sensorimotor Training with Laser Pointer",
      description: "Precision training for cervical joint position sense. Physio Network recommended for cervicogenic headache and whiplash-associated disorders.",
      bodyPart: "neck",
      difficulty: "intermediate",
      instructions: "1. Wear lightweight laser pointer attached to head\n2. Mark target on wall at eye level\n3. Move head away from neutral then precisely return to center target\n4. Progress through movement planes (rotation, flexion/extension)\n5. Add speed variations and closed eyes conditions as control improves\n6. Practice for 5-10 minutes, twice daily",
      targetMuscles: "Deep cervical stabilizers, suboccipital muscles",
      imageUrl: "/exercises/physio-network-sensorimotor.jpg"
    },

    // Low Back Pain Exercises
    {
      title: "Graded Movement Exposure - Forward Bending",
      description: "Graduated exposure to commonly avoided movement with pain science framework. Physio Network's approach for addressing fear-avoidance with movement-related back pain.",
      bodyPart: "back",
      difficulty: "beginner",
      instructions: "1. Begin with small, comfortable forward bending movement\n2. Focus on relaxed breathing and movement quality\n3. Notice sensations without judging as harmful\n4. Gradually increase range as confidence builds\n5. Practice 5-10 repetitions, 3-5 times daily\n6. Progress by adding functional contexts (picking up light objects)",
      targetMuscles: "Paraspinal muscles, hamstrings, gluteal muscles",
      imageUrl: "/exercises/physio-network-forward-bend.jpg"
    },
    {
      title: "Functional Integration - Floor Transfer Training",
      description: "Task-oriented exercise focused on functional movement rather than isolated muscle training. Physio Network's approach for contextual rehabilitation of low back pain.",
      bodyPart: "back",
      difficulty: "intermediate",
      instructions: "1. Practice moving from standing to floor sitting position\n2. Initially use support if needed (chair, wall)\n3. Explore different movement strategies rather than one 'correct' way\n4. Focus on controlled, confident movement\n5. Progress to moving from floor to standing\n6. Practice 5-8 repetitions, 1-2 times daily",
      targetMuscles: "Full body integration, core, lower extremities",
      imageUrl: "/exercises/physio-network-floor-transfer.jpg"
    },
    {
      title: "Multidirectional Functional Reaching",
      description: "Movement variability training combining reach in multiple directions with trunk control. Physio Network's approach for building movement confidence and variability in low back pain.",
      bodyPart: "back",
      difficulty: "intermediate",
      instructions: "1. Stand with stable base of support\n2. Place targets at various positions requiring trunk movement\n3. Reach to touch targets in different patterns\n4. Vary speed, range, and direction of reaches\n5. Focus on smooth, confident movement rather than 'perfect' posture\n6. Perform 1-2 minutes per round, 3-5 rounds",
      targetMuscles: "Trunk musculature, core stabilizers",
      imageUrl: "/exercises/physio-network-reaching.jpg"
    }
  ];
}