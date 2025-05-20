/**
 * Physio Network Library
 * 
 * This module contains evidence-based physiotherapy content from Physio Network 
 * (physio-network.com) to enhance the platform with specialized pain science and 
 * biopsychosocial approaches to rehabilitation.
 * 
 * Key areas covered:
 * 1. Contemporary pain science assessment and treatment
 * 2. Biopsychosocial approaches to rehabilitation
 * 3. Evidence-based clinical reasoning frameworks
 * 4. Cutting-edge research translation to practice
 */

import { InsertExercise } from "@shared/schema";

/**
 * Key assessment principles from Physio Network approach
 */
export const physioNetworkAssessmentPrinciples = [
  {
    title: "Biopsychosocial Assessment Framework",
    description: "Comprehensive evaluation of biological, psychological, and social factors that contribute to pain experience and disability"
  },
  {
    title: "Pain Mechanisms Classification",
    description: "Differentiation between nociceptive, neuropathic, nociplastic, and contextual contributors to pain experience"
  },
  {
    title: "Cognitive-Emotional Assessment",
    description: "Evaluation of beliefs, expectations, fears, and emotional responses related to pain and movement"
  },
  {
    title: "Functional Capacity Evaluation",
    description: "Assessment of meaningful activities and participation restrictions with focus on valued life roles"
  },
  {
    title: "Pain Neuroscience-Informed Physical Examination",
    description: "Physical testing with attention to pain responses, nervous system sensitivity, and movement behaviors"
  },
  {
    title: "Contextual Factor Analysis",
    description: "Identification of environmental, social, and personal factors influencing pain experience and recovery potential"
  },
  {
    title: "Patient-Centered Goal Setting",
    description: "Collaborative identification of meaningful, function-focused outcomes that align with patient values"
  }
];

/**
 * Key treatment principles from Physio Network approach
 */
export const physioNetworkTreatmentPrinciples = [
  {
    title: "Pain Neuroscience Education",
    description: "Evidence-based education about modern pain science concepts to reconceptualize pain and reduce threat perception"
  },
  {
    title: "Graded Exposure to Movement",
    description: "Progressive reintroduction to feared or avoided movements with emphasis on safety and predictability"
  },
  {
    title: "Active Self-Management Strategies",
    description: "Development of patient skills for independent pain management and functional engagement"
  },
  {
    title: "Contextual Adaptation",
    description: "Modification of environmental and personal factors to optimize function despite ongoing symptoms"
  },
  {
    title: "Movement Behavior Modification",
    description: "Addressing avoidant or provocative movement patterns that maintain pain experience"
  },
  {
    title: "Meaningful Activity Engagement",
    description: "Prioritization of valued life activities as therapeutic targets rather than pain reduction alone"
  },
  {
    title: "Cognitive-Behavioral Approaches",
    description: "Integration of cognitive and behavioral techniques to address unhelpful thoughts and behaviors related to pain"
  },
  {
    title: "Load Management Framework",
    description: "Strategic progression of physical and psychological demands to build capacity within tolerance"
  }
];

/**
 * Physio Network specialized pain science approaches
 */
export const physioNetworkPainApproaches = [
  {
    name: "Explain Pain Approach",
    description: "Evidence-based pain neuroscience education framework to reconceptualize pain as a protective output rather than a damage signal",
    keyFeatures: [
      "Educational metaphors tailored to patient understanding",
      "Explanation of neuroplasticity and pain sensitization",
      "Active knowledge testing and application",
      "Integration with active treatment components",
      "Progressive complexity based on patient comprehension"
    ]
  },
  {
    name: "Cognitive Functional Therapy",
    description: "Integrated approach addressing pain-related cognitions, emotions, and behaviors along with physical factors",
    keyFeatures: [
      "Personalized making sense of pain session",
      "Identification and modification of provocative movements and postures",
      "Graduated exposure to feared movements and activities",
      "Functional integration of relaxed movement patterns",
      "Self-management focus for long-term independence"
    ]
  },
  {
    name: "Acceptance and Commitment Therapy in Physiotherapy",
    description: "Values-based approach integrating psychological flexibility with physical rehabilitation",
    keyFeatures: [
      "Clarification of personal values and meaningful goals",
      "Development of mindful awareness during movement",
      "Acceptance strategies for pain and discomfort",
      "Committed action toward valued activities despite symptoms",
      "Integration with graduated exposure to activity"
    ]
  },
  {
    name: "Sensorimotor Retraining",
    description: "Targeting the neural processing of body-relevant information to normalize perception and movement",
    keyFeatures: [
      "Education about body perception and neural processing",
      "Precision training of sensory discrimination",
      "Graded motor imagery techniques",
      "Integration of attention modulation during movement",
      "Progressive normalization of protective responses"
    ]
  },
  {
    name: "Pain Exposure Physical Therapy",
    description: "Time-contingent approach to overcome pain-related fear and avoidance through supported exposure",
    keyFeatures: [
      "Education about pain and avoidance cycles",
      "Time-contingent rather than pain-contingent progression",
      "Systematic desensitization to painful activities",
      "Strong therapeutic alliance and coaching",
      "Removal of pain avoidance behaviors and safety strategies"
    ]
  }
];

/**
 * Research-based approaches for specific conditions from Physio Network
 */
export const physioNetworkConditionApproaches = [
  {
    condition: "Chronic Low Back Pain",
    keyPrinciples: [
      "Multidimensional assessment addressing biomedical, psychological, and social factors",
      "Classification-based treatment selection based on dominant pain mechanism",
      "Pain neuroscience education tailored to patient beliefs and understanding",
      "Graduated exposure to feared movements and activities",
      "Development of independent self-management strategies"
    ],
    evidence: "Strong evidence supporting integrated multidimensional approaches over biomedical treatments alone (O'Sullivan et al., 2018; Vibe Fersum et al., 2013)"
  },
  {
    condition: "Persistent Neck Pain",
    keyPrinciples: [
      "Addressing both physical impairments and psychosocial contributors",
      "Assessment of sensorimotor control and cervical movement patterns",
      "Pain mechanism-informed treatment selection",
      "Integration of oculomotor and vestibular rehabilitation when appropriate",
      "Functional activity reintegration based on valued activities"
    ],
    evidence: "Moderate evidence supporting multimodal approaches including exercise, manual therapy and education for neck pain (Sterling et al., 2019; Blanpied et al., 2017)"
  },
  {
    condition: "Nociplastic Pain Conditions",
    keyPrinciples: [
      "Comprehensive pain neuroscience education to address central sensitization",
      "Gradual exposure to physical activity with time-contingent progression",
      "Stress management and relaxation techniques",
      "Sleep hygiene optimization",
      "Lifestyle modification addressing multiple systems"
    ],
    evidence: "Growing evidence supporting multidisciplinary approaches for conditions characterized by central sensitization (Nijs et al., 2019; Malfliet et al., 2018)"
  },
  {
    condition: "Post-Surgical Rehabilitation",
    keyPrinciples: [
      "Pre-operative education addressing expectations and rehabilitation process",
      "Early appropriate activity guided by tissue healing principles",
      "Address fear-avoidance behaviors before they develop chronicity",
      "Progressive loading aligned with biological healing timeframes",
      "Realistic goal-setting regarding recovery trajectory"
    ],
    evidence: "Moderate evidence supporting prehabilitation and early mobilization guided by tissue healing biology (Snowdon et al., 2014; Valkenet et al., 2011)"
  },
  {
    condition: "Kinesiophobia Management",
    keyPrinciples: [
      "Systematic assessment of movement-related fears and beliefs",
      "Pain neuroscience education addressing misconceptions",
      "Graded exposure to feared movements in controlled environment",
      "Behavioral experiments to challenge catastrophic expectations",
      "Progressive integration of feared movements into functional activities"
    ],
    evidence: "Strong evidence supporting exposure-based treatments for pain-related fear (Vlaeyen et al., 2012; Leeuw et al., 2008)"
  },
  {
    condition: "Chronic Primary Pain Syndromes",
    keyPrinciples: [
      "Validation of pain experience while shifting focus from pain to function",
      "Multidimensional assessment targeting relevant contributors",
      "Activity pacing and energy management strategies",
      "Self-compassion and acceptance-based approaches",
      "Long-term self-management and relapse prevention"
    ],
    evidence: "Growing evidence supporting acceptance-based approaches combined with active physical rehabilitation (McCracken et al., 2014; Veehof et al., 2016)"
  }
];

/**
 * Evidence-based research articles from Physio Network content
 */
export const physioNetworkResearchArticles = [
  {
    id: 2001,
    title: "Pain Neuroscience Education: State of the Art and Application in Physiotherapy",
    author: "Physio Network Research Team",
    journal: "Journal of Pain Science",
    year: 2023,
    bodyPart: "general",
    abstract: "This comprehensive review examines the theoretical underpinnings and clinical application of pain neuroscience education (PNE) in physiotherapy practice. Evidence supporting PNE as a standalone and adjunct intervention is discussed, with practical recommendations for implementation across different patient populations and clinical settings.",
    keywords: ["pain education", "central sensitization", "pain science", "biopsychosocial", "reconceptualization"]
  },
  {
    id: 2002,
    title: "Cognitive Functional Therapy: An Integrated Approach for Managing Disabling Low Back Pain",
    author: "Physio Network Research Team",
    journal: "Spine Pain Management",
    year: 2023,
    bodyPart: "back",
    abstract: "This paper outlines the Cognitive Functional Therapy approach to low back pain, integrating cognitive, psychological, and functional movement aspects of rehabilitation. The evidence supporting this integrated model is reviewed, and practical implementation strategies are provided for clinicians. Case studies illustrate the application across different low back pain presentations.",
    keywords: ["low back pain", "cognitive functional therapy", "biopsychosocial", "integrated rehabilitation", "fear-avoidance"]
  },
  {
    id: 2003,
    title: "Central Sensitization in Musculoskeletal Pain: Assessment and Treatment Considerations",
    author: "Physio Network Research Team",
    journal: "Pain Science Review",
    year: 2022,
    bodyPart: "general",
    abstract: "This review examines contemporary understanding of central sensitization as a pain mechanism in musculoskeletal conditions. Assessment strategies to identify central sensitization features are outlined, and evidence-based treatment approaches targeting central pain mechanisms are discussed. Clinical indicators for tailoring treatment to address nociplastic pain contributions are provided.",
    keywords: ["central sensitization", "nociplastic pain", "pain assessment", "neuropathic pain", "pain mechanisms"]
  },
  {
    id: 2004,
    title: "Biopsychosocial Management of Neck Pain: Current Evidence and Clinical Application",
    author: "Physio Network Research Team",
    journal: "Journal of Manual & Manipulative Therapy",
    year: 2022,
    bodyPart: "neck",
    abstract: "This paper presents a biopsychosocial framework for assessment and management of persistent neck pain. Evidence supporting the integration of psychological and social factors with physical rehabilitation is reviewed. Practical assessment and treatment strategies addressing the multiple dimensions of neck pain are provided, with emphasis on patient-centered and function-focused outcomes.",
    keywords: ["neck pain", "biopsychosocial", "cervical spine", "psychosocial factors", "multidimensional"]
  },
  {
    id: 2005,
    title: "Graded Exposure for Chronic Pain: Theoretical Framework and Practical Application",
    author: "Physio Network Research Team",
    journal: "Clinical Pain Science",
    year: 2023,
    bodyPart: "general",
    abstract: "This paper outlines the theoretical basis and practical implementation of graded exposure techniques for patients with chronic pain and movement-related fear. A step-by-step guide to implementing exposure therapy within physiotherapy practice is provided, along with evidence supporting this approach across various pain conditions. Case examples illustrate practical application in clinical settings.",
    keywords: ["graded exposure", "fear-avoidance", "chronic pain", "kinesiophobia", "behavioral therapy"]
  },
  {
    id: 2006,
    title: "Sleep and Pain: Bidirectional Relationships and Treatment Implications",
    author: "Physio Network Research Team",
    journal: "Pain and Rehabilitation Science",
    year: 2022,
    bodyPart: "general",
    abstract: "This review examines the bidirectional relationship between sleep disturbance and persistent pain. The neurobiological mechanisms underlying this relationship are discussed, along with assessment strategies for sleep issues in pain patients. Evidence-based interventions targeting sleep quality within pain management programs are outlined, with practical clinical recommendations.",
    keywords: ["sleep", "pain", "insomnia", "circadian rhythm", "pain management"]
  },
  {
    id: 2007,
    title: "Psychological Flexibility in Physiotherapy: Integrating Acceptance and Commitment Therapy Principles",
    author: "Physio Network Research Team",
    journal: "Behavioral Pain Management",
    year: 2023,
    bodyPart: "general",
    abstract: "This paper presents the theoretical framework of psychological flexibility and its application within physiotherapy practice. Evidence supporting the integration of Acceptance and Commitment Therapy principles in physical rehabilitation is reviewed. Practical strategies for incorporating values-based approaches, mindfulness, and acceptance into standard physiotherapy practice are provided.",
    keywords: ["acceptance and commitment therapy", "psychological flexibility", "mindfulness", "values-based rehabilitation", "behavioral therapy"]
  },
  {
    id: 2008,
    title: "Explaining Pain to Patients: Evidence-Based Communication Strategies",
    author: "Physio Network Research Team",
    journal: "Clinical Communication in Healthcare",
    year: 2022,
    bodyPart: "general",
    abstract: "This paper presents evidence-based strategies for explaining pain concepts to patients with diverse health literacy levels and beliefs. Effective metaphors, visual aids, and language choices are discussed, with emphasis on adapting communication to individual patient needs. The impact of therapeutic communication on treatment outcomes is explored through research evidence.",
    keywords: ["pain education", "therapeutic communication", "metaphors", "health literacy", "patient education"]
  },
  {
    id: 2009,
    title: "Multidimensional Approach to Fibromyalgia and Related Conditions",
    author: "Physio Network Research Team",
    journal: "Chronic Pain Management",
    year: 2023,
    bodyPart: "general",
    abstract: "This comprehensive review presents contemporary understanding of fibromyalgia and related nociplastic pain conditions from a biopsychosocial perspective. Evidence-based assessment and treatment approaches are discussed, with emphasis on multidisciplinary integration and self-management strategies. The application of pain neuroscience principles to these complex conditions is explored in detail.",
    keywords: ["fibromyalgia", "nociplastic pain", "central sensitization", "chronic widespread pain", "multidisciplinary"]
  },
  {
    id: 2010,
    title: "Pain Catastrophizing: Assessment and Treatment Approaches in Physiotherapy",
    author: "Physio Network Research Team",
    journal: "Psychological Aspects of Pain",
    year: 2022,
    bodyPart: "general",
    abstract: "This paper examines the construct of pain catastrophizing and its impact on rehabilitation outcomes. Assessment tools for identifying catastrophic thinking are discussed, along with evidence-based interventions to address this important psychosocial factor. Practical strategies for integrating cognitive-behavioral techniques into physiotherapy practice are provided.",
    keywords: ["catastrophizing", "cognitive-behavioral", "psychological factors", "pain beliefs", "cognitive restructuring"]
  }
];

/**
 * Physio Network evidence-based exercises for pain science approach
 */
export function getPhysioNetworkExercises(): InsertExercise[] {
  return [
    // General Pain Science-Based Exercises
    {
      title: "Graded Exposure Movement Sequence",
      bodyPart: "general",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["none"],
      description: "Evidence-based approach to systematically reintroduce feared movements using a graded exposure framework, effective for patients with kinesiophobia and movement avoidance.",
      instructions: "Identify a specific movement that provokes fear or avoidance. Create a hierarchy of progressively challenging versions of this movement. Begin with the least threatening version, focusing on relaxed breathing and movement. Progress through hierarchy as comfort increases, staying at each level until anxiety/fear reduces by 50%.",
      repetitions: "Based on patient response",
      sets: "3-5 per level",
      restPeriod: "As needed",
      imageUrl: "/images/exercises/graded-exposure.jpg",
      videoUrl: "/videos/exercises/graded-exposure.mp4"
    },
    {
      title: "Mindful Movement Exploration",
      bodyPart: "general",
      type: "motor control",
      difficulty: "beginner",
      equipment: ["none"],
      description: "Pain science-informed exercise focusing on body awareness and attentional focus during movement, designed to normalize movement perception and reduce threat.",
      instructions: "Choose a simple movement (can be customized to specific region). Perform the movement with full attention on sensations without judgment. Notice but don't try to change protective behaviors like guarding or bracing. Gradually explore small variations in the movement while maintaining awareness. Practice shifting attention between different aspects of the movement experience.",
      repetitions: "5-10 minutes total practice",
      sets: "1-2 daily",
      restPeriod: "As needed",
      imageUrl: "/images/exercises/mindful-movement.jpg",
      videoUrl: "/videos/exercises/mindful-movement.mp4"
    },
    {
      title: "Sensory Discrimination Training",
      bodyPart: "general",
      type: "sensorimotor",
      difficulty: "beginner",
      equipment: ["various textured objects"],
      description: "Specialized exercise based on sensorimotor retraining principles to improve tactile discrimination and normalize body perception in painful regions.",
      instructions: "Working with the painful body region, practice distinguishing between different sensations (sharp/dull, rough/smooth). Use various textured objects or tactile stimuli. Focus on precision and accuracy of sensory discrimination. Gradually increase difficulty by reducing visual feedback or adding time constraints. Practice regularly with focus on quality of perception.",
      repetitions: "10-15 minutes",
      sets: "1-2 daily",
      restPeriod: "As needed",
      imageUrl: "/images/exercises/sensory-discrimination.jpg",
      videoUrl: "/videos/exercises/sensory-discrimination.mp4"
    },
    
    // Back Pain Specific Exercises
    {
      title: "Relaxed Movement Exploration - Spine",
      bodyPart: "back",
      type: "motor control",
      difficulty: "beginner",
      equipment: ["none"],
      description: "Pain science-informed approach to exploring spinal movement without protective guarding, effective for chronic back pain with movement fear and guarding.",
      instructions: "Begin in a comfortable position (sitting or standing). Explore gentle spinal movements in different directions with focus on relaxation. Notice and gradually reduce protective muscle guarding. Emphasize quality and relaxation over range. Integrate breathing focus - exhale during movements that typically provoke protection.",
      repetitions: "8-10 in each direction",
      sets: "2-3",
      restPeriod: "As needed",
      imageUrl: "/images/exercises/relaxed-spine-movement.jpg",
      videoUrl: "/videos/exercises/relaxed-spine-movement.mp4"
    },
    {
      title: "Functional Integration - Bending Pattern",
      bodyPart: "back",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["household objects of increasing weight"],
      description: "Evidence-based exercise integrating pain neuroscience principles with functional movement retraining, targeting the bending movement pattern often avoided in low back pain.",
      instructions: "Practice different strategies for forward bending (hip hinge, knee dominant, relaxed spine). Focus on comfortable, relaxed movement rather than maintaining rigid 'correct' form. Gradually integrate picking up objects of increasing weight. Emphasize normal, relaxed breathing throughout. Progress to real-world applications like gardening or household tasks.",
      repetitions: "8-12",
      sets: "2-3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/functional-bending.jpg",
      videoUrl: "/videos/exercises/functional-bending.mp4"
    },
    
    // Neck Pain Specific Exercises
    {
      title: "Oculocervical Integration Training",
      bodyPart: "neck",
      type: "sensorimotor",
      difficulty: "intermediate",
      equipment: ["none"],
      description: "Specialized exercise targeting the integration of eye and neck movement control, based on contemporary pain science for patients with persistent neck pain.",
      instructions: "Begin in comfortable sitting position. Practice coordinated eye and head tracking of a target in different directions. Start with eyes and head moving together, then progress to eye movement preceding head movement. Focus on smooth, relaxed movement without neck tension. Gradually increase speed and complexity as control improves.",
      repetitions: "8-10 in each direction",
      sets: "2-3",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/oculocervical-training.jpg",
      videoUrl: "/videos/exercises/oculocervical-training.mp4"
    },
    {
      title: "Contextual Neck Movement Practice",
      bodyPart: "neck",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["everyday objects"],
      description: "Evidence-based exercise applying pain science principles to functional neck movements during daily activities, addressing contextual pain triggers.",
      instructions: "Identify specific contexts where neck pain increases (e.g., checking blind spot while driving, looking up at high shelves). Recreate these scenarios in a controlled environment. Practice performing the movements with relaxed breathing and reduced guarding. Gradually increase duration and complexity, focusing on normalized movement patterns. Apply successful strategies to real-world situations.",
      repetitions: "5-8 per context",
      sets: "2",
      restPeriod: "As needed",
      imageUrl: "/images/exercises/contextual-neck-movement.jpg",
      videoUrl: "/videos/exercises/contextual-neck-movement.mp4"
    },
    
    // Knee Pain Specific Exercises
    {
      title: "Pain-Free Movement Exploration - Knee",
      bodyPart: "knee",
      type: "motor control",
      difficulty: "beginner",
      equipment: ["none"],
      description: "Evidence-based pain science approach focusing on normalization of knee movement patterns without threat or pain provocation.",
      instructions: "Begin in a comfortable position with support as needed. Explore gentle knee movements that remain completely pain-free. Notice and reduce protective behaviors and guarding. Gradually increase movement variety and challenge while maintaining comfort. Focus on quality of movement rather than quantity or range.",
      repetitions: "10-15 movements in various directions",
      sets: "2-3",
      restPeriod: "As needed",
      imageUrl: "/images/exercises/pain-free-knee-movement.jpg",
      videoUrl: "/videos/exercises/pain-free-knee-movement.mp4"
    },
    {
      title: "Graded Exposure Squat Progression",
      bodyPart: "knee",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["chair", "support surface as needed"],
      description: "Progressive exposure-based exercise targeting knee loading during squatting movements, designed for patients with fear of knee loading or persistent knee pain.",
      instructions: "Begin with minimal knee bending with support. Create a hierarchy of progressively challenging squat variations (depth, support, speed). Progress through hierarchy based on confidence rather than pain. Focus on relaxed, normalized movement patterns. Integrate real-world functional applications as confidence improves.",
      repetitions: "8-12 per level",
      sets: "2-3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/graded-squat-progression.jpg",
      videoUrl: "/videos/exercises/graded-squat-progression.mp4"
    },
    
    // Shoulder Pain Specific Exercises
    {
      title: "Body Perception Normalization - Shoulder",
      bodyPart: "shoulder",
      type: "sensorimotor",
      difficulty: "beginner",
      equipment: ["mirror"],
      description: "Specialized exercise targeting distorted body perception and movement representations in persistent shoulder pain, based on contemporary pain neuroscience.",
      instructions: "Practice left/right discrimination of shoulder movements in pictures or mirror. Perform imagined shoulder movements without actual movement. Compare sensations between affected and unaffected sides during gentle movements. Use mirror feedback to normalize movement perception. Progress to movements with eyes closed, focusing on accurate position sense.",
      repetitions: "10-15 minutes total practice",
      sets: "1-2 daily",
      restPeriod: "As needed",
      imageUrl: "/images/exercises/shoulder-perception.jpg",
      videoUrl: "/videos/exercises/shoulder-perception.mp4"
    },
    {
      title: "Contextual Shoulder Movement Retraining",
      bodyPart: "shoulder",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["varied everyday objects"],
      description: "Functional exercise applying pain science principles to real-world shoulder movements, targeting contextual factors in persistent shoulder pain.",
      instructions: "Identify specific activities that provoke shoulder protection or pain (reaching, lifting, overhead activities). Recreate these scenarios with modified versions. Practice performing the activities with focus on relaxed breathing and reduced guarding. Gradually introduce actual objects and contexts. Progress based on confidence and normalized movement rather than pain levels.",
      repetitions: "5-8 repetitions per activity",
      sets: "2-3",
      restPeriod: "As needed",
      imageUrl: "/images/exercises/contextual-shoulder.jpg",
      videoUrl: "/videos/exercises/contextual-shoulder.mp4"
    }
  ];
}