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

import { InsertExercise } from "@shared/schema";

/**
 * Key assessment principles from Clinical Edge approach
 */
export const clinicalEdgeAssessmentPrinciples = [
  {
    title: "Comprehensive Movement Assessment",
    description: "Evaluate movement patterns across regional interdependence to identify primary vs. compensatory dysfunction"
  },
  {
    title: "Systematic Load Testing",
    description: "Apply progressive loading during assessment to determine tissue capacity and pain response to mechanical stress"
  },
  {
    title: "Pain Mechanisms Classification",
    description: "Differentiate between nociceptive, neuropathic, and nociplastic pain to guide treatment approach"
  },
  {
    title: "Detailed Subjective Questioning",
    description: "Use precision questioning techniques to identify key aggravating and easing factors for targeted intervention"
  },
  {
    title: "Functional Capacity Testing",
    description: "Assess real-world activities relevant to the patient to establish baseline and monitor progress"
  },
  {
    title: "Sensorimotor Control Analysis",
    description: "Evaluate proprioception, motor control, and neuromuscular coordination specific to the affected region"
  },
  {
    title: "Tissue-Specific Tests",
    description: "Use validated orthopedic tests to assess specific tissue structures with attention to sensitivity and specificity"
  }
];

/**
 * Key treatment principles from Clinical Edge approach
 */
export const clinicalEdgeTreatmentPrinciples = [
  {
    title: "Active Before Passive Interventions",
    description: "Prioritize active patient participation in treatment with passive techniques as adjuncts only when necessary"
  },
  {
    title: "Graduated Loading Progression",
    description: "Systematically progress tissue loading based on adaptation and symptom response rather than arbitrary timeframes"
  },
  {
    title: "Motor Control Retraining",
    description: "Restore optimal movement patterns through specific neuromuscular training with attention to quality of movement"
  },
  {
    title: "Evidence-Based Exercise Prescription",
    description: "Select exercises based on latest research for specific conditions, with appropriate dosage parameters"
  },
  {
    title: "Functional Translation",
    description: "Ensure clinical improvements transfer to meaningful functional activities for the individual patient"
  },
  {
    title: "Multimodal Approach",
    description: "Integrate manual therapy, exercise, education and lifestyle modifications based on individual presentation"
  },
  {
    title: "Self-Management Emphasis",
    description: "Empower patients with skills and knowledge to manage their condition independently long-term"
  },
  {
    title: "Regular Reassessment",
    description: "Continuously evaluate treatment response to modify approach based on objective markers of progress"
  }
];

/**
 * Research-based approaches for specific conditions from Clinical Edge
 */
export const clinicalEdgeConditionApproaches = [
  {
    condition: "Patellofemoral Pain Syndrome",
    keyPrinciples: [
      "Progressive hip and knee strengthening with control emphasis",
      "Address movement quality in functional tasks over isolated strength only",
      "Include proximal (hip) and distal (foot/ankle) factors in assessment and treatment",
      "Graduated loading progression for tissue adaptation",
      "Patient education on activity modification and load management"
    ],
    evidence: "Strong evidence from multiple RCTs supporting multimodal approach including exercise therapy focusing on quadriceps and hip strengthening (Barton et al., 2015; Collins et al., 2018)"
  },
  {
    condition: "Rotator Cuff Related Shoulder Pain",
    keyPrinciples: [
      "Progressive loading of rotator cuff and scapular muscles",
      "Correction of scapular dyskinesis as appropriate",
      "Motor control retraining focusing on quality over force generation",
      "Movement pattern retraining during functional activities",
      "Education on avoiding provocative positions during healing phase"
    ],
    evidence: "Moderate evidence supporting exercise therapy over surgical intervention for most cases (Lewis et al., 2015; Littlewood et al., 2016)"
  },
  {
    condition: "Chronic Low Back Pain",
    keyPrinciples: [
      "Individualized exercise program addressing specific impairments",
      "Graduated exposure to feared movements and activities",
      "Cognitive approaches addressing unhelpful beliefs about pain",
      "Integration of functional movement patterns into daily activities",
      "Long-term self-management strategies for sustained results"
    ],
    evidence: "Strong evidence supporting multimodal approaches including exercise therapy, cognitive behavioral approaches, and education (O'Sullivan et al., 2018; Foster et al., 2018)"
  },
  {
    condition: "Ankle Instability",
    keyPrinciples: [
      "Progressive proprioceptive training with varied surfaces and perturbation",
      "Peroneal muscle strengthening and motor control training",
      "Functional movement pattern correction during gait and sport-specific activities",
      "Taping or bracing as adjuncts during return to activity",
      "Neuromuscular training focusing on reaction time and coordination"
    ],
    evidence: "Moderate to strong evidence supporting proprioceptive training, strengthening, and neuromuscular training (Delahunt et al., 2016; Donovan et al., 2016)"
  },
  {
    condition: "ACL Rehabilitation",
    keyPrinciples: [
      "Criterion-based progression rather than time-based protocols",
      "Early emphasis on restoring full extension and quadriceps activation",
      "Neuromuscular training addressing landing mechanics and deceleration",
      "Psychological readiness assessment before return to sport",
      "Comprehensive testing of strength, power, and function before clearance"
    ],
    evidence: "Strong evidence supporting criterion-based rehabilitation including strength, neuromuscular control, and psychological readiness (Grindem et al., 2016; Kyritsis et al., 2016)"
  },
  {
    condition: "Plantar Fasciopathy",
    keyPrinciples: [
      "Progressive loading through heel raises with varied speeds",
      "Foot intrinsic muscle strengthening and motor control",
      "Temporary activity modification to manage load",
      "Footwear assessment and modification as needed",
      "Addressing proximal contributors (calf, hip, kinetic chain)"
    ],
    evidence: "Moderate evidence supporting heavy-slow resistance training and load management (Rathleff et al., 2015; Riel et al., 2018)"
  },
  {
    condition: "Tendinopathy Management",
    keyPrinciples: [
      "Staged loading program with isometric, isotonic and energy storage exercises",
      "Pain monitoring during exercise using acceptable symptom response",
      "Modification of compression and tensile loads as appropriate",
      "Addressing contributing biomechanical factors",
      "Education on tendon pathology and recovery expectations"
    ],
    evidence: "Strong evidence supporting progressive loading programs for various tendinopathies (Malliaras et al., 2015; Rio et al., 2016)"
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
        name: "Advanced Knee Rehabilitation Framework",
        description: "Comprehensive approach to knee rehabilitation based on detailed biomechanical analysis and specific loading progressions",
        keyFeatures: [
          "Movement analysis during functional tasks",
          "Graded exposure to loading across different contraction types",
          "Integration of hip and foot/ankle function",
          "Sport or activity-specific movement retraining",
          "Comprehensive return-to-activity criteria"
        ]
      },
      {
        name: "Clinical Edge ACL Recovery Protocol",
        description: "Evidence-based approach to ACL rehabilitation focusing on criterion-based progression and comprehensive neuromuscular control",
        keyFeatures: [
          "Early restoration of full range of motion",
          "Progressive quadriceps activation strategies",
          "Targeted neuromuscular control training",
          "Psychological readiness assessment",
          "Comprehensive return-to-sport testing"
        ]
      },
      {
        name: "Patellofemoral Precision Approach",
        description: "Specialized framework for addressing patellofemoral pain through targeted interventions addressing proximal, local and distal factors",
        keyFeatures: [
          "Comprehensive kinetic chain assessment",
          "Progressive loading of key muscle groups",
          "Movement pattern correction during functional tasks",
          "Taping techniques as short-term adjuncts",
          "Activity modification strategies"
        ]
      }
    ]
  },
  {
    bodyPart: "hip",
    specializedApproaches: [
      {
        name: "Hip Arthritis Management Program",
        description: "Comprehensive approach to managing hip osteoarthritis focusing on appropriate loading and functional maintenance",
        keyFeatures: [
          "Appropriate exercise selection avoiding provocation",
          "Activity modification strategies",
          "Pain management techniques",
          "Strength and range of motion maintenance",
          "Long-term self-management education"
        ]
      },
      {
        name: "Hip-Spine Connection Framework",
        description: "Integrated approach addressing the interrelationship between hip and lumbar spine dysfunction",
        keyFeatures: [
          "Differential diagnosis between hip and spine pathology",
          "Assessment of movement coordination between regions",
          "Targeted interventions for primary dysfunction source",
          "Integrated rehabilitation addressing both regions",
          "Functional movement pattern retraining"
        ]
      },
      {
        name: "Femoroacetabular Impingement Approach",
        description: "Specialized protocol for managing FAI syndrome through appropriate modification and progressive loading",
        keyFeatures: [
          "Identification of provocative movements and positions",
          "Activity modification to reduce symptoms",
          "Exercise selection avoiding impingement positions",
          "Progressive loading of hip musculature",
          "Education on long-term management"
        ]
      }
    ]
  },
  {
    bodyPart: "ankle",
    specializedApproaches: [
      {
        name: "Dynamic Ankle Stability Program",
        description: "Comprehensive approach to rehabilitation of chronic ankle instability focusing on proprioception and neuromuscular control",
        keyFeatures: [
          "Progressive proprioceptive challenges",
          "Peroneal strength and reaction training",
          "Dynamic balance exercises",
          "Sport-specific movement retraining",
          "Functional testing before return to activity"
        ]
      },
      {
        name: "Achilles Tendon Loading Protocol",
        description: "Evidence-based approach to Achilles tendinopathy management using progressive loading principles",
        keyFeatures: [
          "Isometric loading for pain modulation",
          "Progressive heavy slow resistance training",
          "Energy storage loading progression",
          "Integration of kinetic chain function",
          "Running retraining as appropriate"
        ]
      },
      {
        name: "Post-Ankle Fracture Rehabilitation",
        description: "Structured rehabilitation protocol following ankle fracture to optimize recovery and prevent chronic issues",
        keyFeatures: [
          "Early appropriate motion as medically cleared",
          "Progressive weight bearing as indicated",
          "Staged strengthening progression",
          "Balance and proprioception retraining",
          "Return to function and sport-specific training"
        ]
      }
    ]
  },
  {
    bodyPart: "shoulder",
    specializedApproaches: [
      {
        name: "Rotator Cuff Precision Rehabilitation",
        description: "Targeted approach to rotator cuff pathology focusing on appropriate loading and movement quality",
        keyFeatures: [
          "Scapular position and control assessment",
          "Graduated rotator cuff loading program",
          "Integration of kinetic chain function",
          "Movement pattern retraining",
          "Modification of aggravating activities"
        ]
      },
      {
        name: "Shoulder Instability Framework",
        description: "Evidence-based approach to managing shoulder instability through progressive neuromuscular control training",
        keyFeatures: [
          "Assessment of instability direction and severity",
          "Specific exercise selection based on instability type",
          "Motor control emphasis in varying positions",
          "Proprioceptive training progression",
          "Sport or activity-specific rehabilitation"
        ]
      },
      {
        name: "Post-Operative Shoulder Protocol",
        description: "Structured rehabilitation following shoulder surgery with emphasis on tissue healing considerations and optimal loading",
        keyFeatures: [
          "Respect for tissue healing timeframes",
          "Appropriate early motion within safe limits",
          "Progressive strengthening respecting surgical procedure",
          "Staged return to functional activities",
          "Education on long-term management"
        ]
      }
    ]
  },
  {
    bodyPart: "elbow",
    specializedApproaches: [
      {
        name: "Lateral Elbow Tendinopathy Management",
        description: "Comprehensive approach to tennis elbow focusing on progressive loading and addressing contributing factors",
        keyFeatures: [
          "Pain modulation strategies",
          "Progressive loading program",
          "Grip strength training",
          "Assessment of cervical and thoracic contribution",
          "Activity modification strategies"
        ]
      },
      {
        name: "Throwing Athlete Elbow Program",
        description: "Specialized approach for overhead athletes with elbow pathology addressing sport-specific demands",
        keyFeatures: [
          "Biomechanical analysis of throwing technique",
          "Progressive loading respecting tissue tolerance",
          "Kinetic chain integration",
          "Graduated return to throwing protocol",
          "Prevention strategies for recurrence"
        ]
      }
    ]
  },
  {
    bodyPart: "back",
    specializedApproaches: [
      {
        name: "Precision Spine Care Framework",
        description: "Individualized approach to spinal pain using detailed assessment and targeted interventions",
        keyFeatures: [
          "Classification-based assessment",
          "Directional preference identification",
          "Movement pattern retraining",
          "Pain mechanism-targeted interventions",
          "Functional activity retraining"
        ]
      },
      {
        name: "Lumbar Control and Movement Program",
        description: "Motor control approach to lumbar spine rehabilitation focusing on precision and quality of movement",
        keyFeatures: [
          "Detailed movement assessment",
          "Specific exercise selection based on presentation",
          "Graduated functional movement progression",
          "Integration into daily activities",
          "Long-term self-management strategies"
        ]
      },
      {
        name: "Spine Load Management Protocol",
        description: "Approach to managing spinal pain through appropriate loading strategies and education",
        keyFeatures: [
          "Assessment of load tolerance",
          "Graduated exposure to previously painful movements",
          "Strength and endurance training",
          "Education on spine health and ergonomics",
          "Sustainable physical activity planning"
        ]
      }
    ]
  },
  {
    bodyPart: "neck",
    specializedApproaches: [
      {
        name: "Cervical Motor Control Framework",
        description: "Precision approach to neck rehabilitation focusing on motor control and sensorimotor function",
        keyFeatures: [
          "Deep neck flexor and extensor assessment",
          "Sensorimotor control training",
          "Oculomotor assessment and training",
          "Graduated loading progression",
          "Integration with upper quadrant function"
        ]
      },
      {
        name: "Cervicogenic Headache Program",
        description: "Specialized approach to managing headaches of cervical origin through targeted interventions",
        keyFeatures: [
          "Differential diagnosis assessment",
          "Manual therapy techniques for appropriate cases",
          "Motor control and strength training",
          "Postural education and ergonomics",
          "Self-management strategies"
        ]
      },
      {
        name: "Post-Whiplash Recovery Protocol",
        description: "Evidence-based approach to managing whiplash-associated disorders and preventing chronicity",
        keyFeatures: [
          "Early appropriate activity rather than rest",
          "Graded exposure to movement",
          "Motor control retraining",
          "Addressing psychological factors",
          "Graduated return to normal activities"
        ]
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
    title: "Progressive Loading in Rotator Cuff Rehabilitation: Current Evidence and Clinical Application",
    author: "Clinical Edge Research Team",
    journal: "Journal of Shoulder and Elbow Physiotherapy",
    year: 2023,
    bodyPart: "shoulder",
    abstract: "This review summarizes current evidence on progressive loading principles for rotator cuff rehabilitation, highlighting the importance of staged exercise progression from isometric to isotonic to functional exercises. Clinical recommendations for load management and exercise selection based on patient presentation are provided.",
    keywords: ["rotator cuff", "shoulder", "exercise therapy", "loading", "rehabilitation"]
  },
  {
    id: 1002,
    title: "Patellofemoral Pain Management: An Evidence-Based Framework for Assessment and Treatment",
    author: "Clinical Edge Research Team",
    journal: "International Journal of Sports Physiotherapy",
    year: 2023,
    bodyPart: "knee",
    abstract: "This paper presents a comprehensive framework for managing patellofemoral pain syndrome based on current best evidence. It outlines a systematic assessment approach and provides recommendations for exercise prescription, load management, and treatment progression. The role of proximal, local, and distal factors in rehabilitation is discussed.",
    keywords: ["patellofemoral pain", "knee", "exercise therapy", "hip strengthening", "rehabilitation"]
  },
  {
    id: 1003,
    title: "Lumbar Spine Rehabilitation: Classification-Based Approaches for Optimal Outcomes",
    author: "Clinical Edge Research Team",
    journal: "Spine Rehabilitation Journal",
    year: 2022,
    bodyPart: "back",
    abstract: "This paper reviews current evidence on classification-based approaches to low back pain management. It outlines key assessment strategies to determine appropriate intervention pathways based on movement preferences, pain mechanisms, and functional limitations. Recommendations for exercise selection and progression are provided based on patient subgrouping.",
    keywords: ["low back pain", "classification", "movement system", "exercise therapy", "rehabilitation"]
  },
  {
    id: 1004,
    title: "ACL Rehabilitation: Current Evidence for Optimal Recovery and Return to Sport",
    author: "Clinical Edge Research Team",
    journal: "Sports Medicine Research",
    year: 2022,
    bodyPart: "knee",
    abstract: "This comprehensive review examines evidence-based approaches to ACL rehabilitation, focusing on criterion-based progression rather than time-based protocols. Key phases of rehabilitation are outlined with specific recommendations for exercise selection, load management, and objective testing criteria for advancement. Return-to-sport decision-making frameworks are discussed with emphasis on reducing reinjury risk.",
    keywords: ["ACL", "knee", "return to sport", "rehabilitation", "neuromuscular training"]
  },
  {
    id: 1005,
    title: "Cervical Motor Control: Assessment and Retraining for Neck Pain and Headaches",
    author: "Clinical Edge Research Team",
    journal: "Journal of Manual & Manipulative Therapy",
    year: 2022,
    bodyPart: "neck",
    abstract: "This paper outlines current evidence for motor control assessment and retraining in patients with neck pain and cervicogenic headaches. Detailed assessment procedures and progressive exercise protocols are presented, with emphasis on deep neck flexor and extensor function, sensorimotor control, and integration with upper quadrant movement.",
    keywords: ["neck pain", "cervicogenic headache", "motor control", "deep neck flexors", "sensorimotor"]
  },
  {
    id: 1006,
    title: "Ankle Instability: Progressive Rehabilitation Strategies for Optimal Function",
    author: "Clinical Edge Research Team",
    journal: "Foot and Ankle Rehabilitation",
    year: 2023,
    bodyPart: "ankle",
    abstract: "This paper presents evidence-based strategies for managing chronic ankle instability, focusing on proprioceptive training, peroneal strengthening, and neuromuscular control. Progressive rehabilitation protocols are outlined with specific exercise recommendations and advancement criteria. Return to sport considerations and reinjury prevention strategies are discussed.",
    keywords: ["ankle instability", "proprioception", "balance", "peroneal muscles", "neuromuscular training"]
  },
  {
    id: 1007,
    title: "Hip-Spine Relationship: Clinical Implications for Assessment and Treatment",
    author: "Clinical Edge Research Team",
    journal: "Journal of Orthopedic Physiotherapy",
    year: 2022,
    bodyPart: "hip",
    abstract: "This review examines the interdependent relationship between hip and lumbar spine function in musculoskeletal disorders. Clinical strategies for differentiating primary sources of dysfunction and addressing regional interdependence are presented. Integrated assessment and treatment approaches are recommended for optimal outcomes in patients with concurrent hip and spine presentations.",
    keywords: ["hip", "lumbar spine", "regional interdependence", "differential diagnosis", "rehabilitation"]
  },
  {
    id: 1008,
    title: "Tendinopathy Management: Current Best Practice for Rehabilitation",
    author: "Clinical Edge Research Team",
    journal: "Tendon Research and Practice",
    year: 2023,
    bodyPart: "general",
    abstract: "This comprehensive review presents current evidence for tendinopathy rehabilitation across various anatomical locations. Stage-appropriate loading strategies are outlined, progressing from isometric to isotonic to energy storage and release exercises. Pain monitoring approaches and criteria for exercise progression are discussed, with practical clinical examples for implementation.",
    keywords: ["tendinopathy", "loading", "exercise therapy", "rehabilitation", "tendon"]
  },
  {
    id: 1009,
    title: "Scapular Dyskinesis: Assessment and Rehabilitation Strategies",
    author: "Clinical Edge Research Team",
    journal: "Shoulder and Upper Quadrant Review",
    year: 2022,
    bodyPart: "shoulder",
    abstract: "This paper presents contemporary approaches to assessment and management of scapular movement dysfunction. Evidence-based rehabilitation strategies focusing on motor control, movement quality, and muscular balance are outlined. The role of scapular dyskinesis in various shoulder pathologies is discussed, with recommendations for integrated upper quadrant rehabilitation.",
    keywords: ["scapula", "dyskinesis", "shoulder", "motor control", "rehabilitation"]
  },
  {
    id: 1010,
    title: "Plantar Heel Pain: Progressive Loading Approaches for Optimal Outcomes",
    author: "Clinical Edge Research Team",
    journal: "Foot Science and Practice",
    year: 2023,
    bodyPart: "foot",
    abstract: "This paper reviews current evidence for managing plantar heel pain with emphasis on progressive loading principles. Recommendations for exercise selection, load parameters, and progression criteria are provided. The paper discusses the integration of local foot interventions with assessment and management of proximal contributing factors in the kinetic chain.",
    keywords: ["plantar fasciitis", "heel pain", "loading", "foot intrinsics", "rehabilitation"]
  }
];

/**
 * Clinical Edge evidence-based exercises for various body regions
 */
export function getClinicalEdgeExercises(): InsertExercise[] {
  return [
    // Knee Exercises
    {
      title: "Spanish Squat with Resistance Band",
      bodyPart: "knee",
      type: "strength",
      difficulty: "intermediate",
      equipment: ["resistance band"],
      description: "Evidence-based exercise for patellofemoral pain focusing on controlled knee loading with minimal patellofemoral stress.",
      instructions: "Place a resistance band around a stable object at knee height. Position the band behind your knees and lean back to create tension. Perform a squat while maintaining band tension. Focus on quality knee tracking and control throughout the movement.",
      repetitions: "8-12",
      sets: "3-4",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/spanish-squat.jpg",
      videoUrl: "/videos/exercises/spanish-squat.mp4"
    },
    {
      title: "Knee Extension with Terminal Isometric Hold",
      bodyPart: "knee",
      type: "strength",
      difficulty: "beginner",
      equipment: ["chair", "ankle weight (optional)"],
      description: "Progressive quadriceps strengthening exercise with terminal isometric component for enhanced motor control and strength, beneficial for patellofemoral pain and knee osteoarthritis.",
      instructions: "Sit on a chair with good posture. Slowly extend one knee until fully straight. Hold the fully extended position for 5 seconds with strong quadriceps contraction. Slowly lower and repeat. Add ankle weights for progression as tolerated.",
      repetitions: "10-15",
      sets: "2-3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/knee-extension-isometric.jpg",
      videoUrl: "/videos/exercises/knee-extension-isometric.mp4"
    },
    {
      title: "Step Down with Controlled Knee Position",
      bodyPart: "knee",
      type: "functional",
      difficulty: "advanced",
      equipment: ["step or box"],
      description: "Functional knee exercise focusing on eccentric quadriceps control and proper alignment during descent, excellent for patellofemoral rehabilitation and return to function training.",
      instructions: "Stand on a step or box (height appropriate to ability). Slowly step down with one leg while maintaining proper knee alignment (knee tracking over second toe). Control the descent with the stance leg. Return to starting position and repeat.",
      repetitions: "8-10 per side",
      sets: "3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/step-down.jpg",
      videoUrl: "/videos/exercises/step-down.mp4"
    },
    
    // Shoulder Exercises
    {
      title: "External Rotation with Scapular Setting",
      bodyPart: "shoulder",
      type: "strength",
      difficulty: "intermediate",
      equipment: ["resistance band"],
      description: "Evidence-based rotator cuff strengthening exercise with emphasis on scapular control, beneficial for rotator cuff tendinopathy and subacromial pain syndrome.",
      instructions: "Stand with elbow bent at 90 degrees and tucked at side. Actively set scapula in slight retraction and depression. While maintaining scapular position, rotate arm externally against band resistance. Control the return and repeat.",
      repetitions: "12-15",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/external-rotation-scapular.jpg",
      videoUrl: "/videos/exercises/external-rotation-scapular.mp4"
    },
    {
      title: "Modified Prone Y with External Rotation",
      bodyPart: "shoulder",
      type: "strength",
      difficulty: "intermediate",
      equipment: ["light dumbbells"],
      description: "Combined movement targeting lower trapezius and rotator cuff muscles with emphasis on control through range, effective for scapular dyskinesis and rotator cuff strengthening.",
      instructions: "Lie prone on a bench or stable surface. Hold light weights with arms hanging down. Lift arms in a Y position (approx. 125 degrees) while simultaneously externally rotating shoulders (thumbs up). Hold briefly at top position, focusing on scapular control. Lower with control and repeat.",
      repetitions: "10-12",
      sets: "3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/prone-y-rotation.jpg",
      videoUrl: "/videos/exercises/prone-y-rotation.mp4"
    },
    
    // Neck Exercises
    {
      title: "Deep Neck Flexor Activation with Precision",
      bodyPart: "neck",
      type: "motor control",
      difficulty: "beginner",
      equipment: ["pressure biofeedback unit (optional)"],
      description: "Motor control exercise targeting deep cervical flexors with minimal superficial muscle activation, essential for neck pain and headache management.",
      instructions: "Lie supine with neutral cervical spine. Perform a gentle nodding motion of the head (as if saying 'yes' very slightly) without activating superficial neck muscles. Hold the position with precision control. Use a pressure biofeedback unit under the neck if available to monitor performance.",
      repetitions: "10 second holds, 10 repetitions",
      sets: "2-3",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/deep-neck-flexor.jpg",
      videoUrl: "/videos/exercises/deep-neck-flexor.mp4"
    },
    {
      title: "Cervical Proprioceptive Training",
      bodyPart: "neck",
      type: "motor control",
      difficulty: "intermediate",
      equipment: ["laser pointer (optional)"],
      description: "Sensorimotor exercise targeting cervical joint position sense and motor control, beneficial for neck pain, headaches, and post-whiplash recovery.",
      instructions: "Sit with good posture. Attach a laser pointer to head band (if available). Draw letters or follow patterns with head movements using precise control. Focus on accuracy and smooth movements rather than range. Progress to eyes-closed position sense training.",
      repetitions: "5 minutes total training time",
      sets: "1-2",
      restPeriod: "As needed",
      imageUrl: "/images/exercises/cervical-proprioception.jpg",
      videoUrl: "/videos/exercises/cervical-proprioception.mp4"
    },
    
    // Back Exercises
    {
      title: "Standing Control Point with Multifidus Activation",
      bodyPart: "back",
      type: "motor control",
      difficulty: "intermediate",
      equipment: ["none"],
      description: "Lumbar motor control exercise focusing on segmental stability and multifidus activation in functional standing position, effective for low back pain and movement control impairments.",
      instructions: "Stand with neutral spine position. Find your 'control point' in neutral lordosis. Perform gentle drawing-in of lower abdominals while maintaining normal breathing. Add subtle multifidus co-activation by focusing on gentle lower back muscular support without movement. Hold position while maintaining normal breathing.",
      repetitions: "30 second holds, 5 repetitions",
      sets: "2-3",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/standing-control-point.jpg",
      videoUrl: "/videos/exercises/standing-control-point.mp4"
    },
    {
      title: "Functional Deadlift Pattern Progression",
      bodyPart: "back",
      type: "functional",
      difficulty: "advanced",
      equipment: ["various objects or weights"],
      description: "Progressive lifting pattern training emphasizing hip hinge and neutral spine control, essential for functional recovery and injury prevention in low back pain.",
      instructions: "Begin with hip hinge practice without weight. Maintain lumbar neutral position while hinging at hips to reach forward with hands. Progress to picking up light object from increasingly lower positions while maintaining optimal movement pattern. Focus on bracing, breathing, and maintaining lumbar control throughout the movement.",
      repetitions: "8-10",
      sets: "3",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/functional-deadlift.jpg",
      videoUrl: "/videos/exercises/functional-deadlift.mp4"
    },
    
    // Hip Exercises
    {
      title: "Progressive Hip Thrust with Load Management",
      bodyPart: "hip",
      type: "strength",
      difficulty: "intermediate",
      equipment: ["bench", "barbell or weight"],
      description: "Evidence-based gluteal strengthening exercise with progressive loading capacity, beneficial for hip pathology, lower limb tendinopathy, and low back pain.",
      instructions: "Sit on floor with upper back against bench, knees bent and feet flat. Place weighted bar across hips (use padding for comfort). Push through heels to lift hips until body forms straight line from shoulders to knees. Focus on gluteal activation rather than lumbar extension. Lower with control and repeat.",
      repetitions: "10-12",
      sets: "3-4",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/hip-thrust.jpg",
      videoUrl: "/videos/exercises/hip-thrust.mp4"
    },
    {
      title: "Multidirectional Hip Control in Weight Bearing",
      bodyPart: "hip",
      type: "functional",
      difficulty: "intermediate",
      equipment: ["step or small platform"],
      description: "Functional hip control exercise targeting gluteal function and neuromuscular control in multiple planes, effective for hip and knee pathologies.",
      instructions: "Stand on one leg on a small step. Maintain pelvic stability while reaching other leg in forward, side, and backward directions with control. Focus on minimizing pelvic drop or rotation during movements. Touch the floor lightly with reaching leg and return to center position between each direction.",
      repetitions: "8-10 in each direction per side",
      sets: "2-3",
      restPeriod: "45 seconds between sides",
      imageUrl: "/images/exercises/multidirectional-hip.jpg",
      videoUrl: "/videos/exercises/multidirectional-hip.mp4"
    },
    
    // Ankle/Foot Exercises
    {
      title: "Progressive Heel Raise Protocol",
      bodyPart: "ankle",
      type: "strength",
      difficulty: "intermediate",
      equipment: ["step", "weights (for progression)"],
      description: "Progressive loading exercise for Achilles tendon and calf complex, with staged advancement from bilateral to unilateral and varied speeds, evidence-based for Achilles tendinopathy.",
      instructions: "Stand with balls of feet on edge of step, heels extending off edge. Perform heel raises through full range of motion, controlling both raising and lowering phases. Begin with bilateral heel raises, progress to unilateral as strength improves. Further progress by adding weight or slowing eccentric (lowering) phase to 5 seconds.",
      repetitions: "15 bilateral progressing to 15 unilateral",
      sets: "3-4",
      restPeriod: "60 seconds",
      imageUrl: "/images/exercises/heel-raise-progression.jpg",
      videoUrl: "/videos/exercises/heel-raise-progression.mp4"
    },
    {
      title: "Dynamic Balance with Perturbation Training",
      bodyPart: "ankle",
      type: "balance",
      difficulty: "advanced",
      equipment: ["balance board or unstable surface", "ball (optional)"],
      description: "Advanced proprioceptive training with reactive elements, essential for ankle instability rehabilitation and return to sport preparation.",
      instructions: "Stand on balance board or unstable surface in single-leg stance. Maintain balance while adding unpredictable perturbations - catching and throwing a ball, reaching in different directions, or having a partner provide light nudges. Focus on rapid stabilization and ankle strategy development.",
      repetitions: "30-60 seconds per side",
      sets: "3-4",
      restPeriod: "30 seconds",
      imageUrl: "/images/exercises/perturbation-balance.jpg",
      videoUrl: "/videos/exercises/perturbation-balance.mp4"
    },
    
    // Elbow Exercises
    {
      title: "Graded Eccentric Wrist Extension",
      bodyPart: "elbow",
      type: "strength",
      difficulty: "intermediate",
      equipment: ["light dumbbell or weight"],
      description: "Progressive eccentric loading exercise for lateral elbow tendinopathy (tennis elbow), based on strong evidence for tendon rehabilitation.",
      instructions: "Sit with forearm supported on a table, wrist at edge, palm down. Hold light weight. Use opposite hand to help lift weight up (concentric phase). Remove helping hand and slowly lower weight (eccentric phase) over 3-5 seconds. Repeat, gradually increasing weight as tolerated based on 24-hour pain response.",
      repetitions: "10-15",
      sets: "3",
      restPeriod: "45 seconds",
      imageUrl: "/images/exercises/eccentric-wrist-extension.jpg",
      videoUrl: "/videos/exercises/eccentric-wrist-extension.mp4"
    }
  ];
}